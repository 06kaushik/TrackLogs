import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, Image, TouchableOpacity, PermissionsAndroid, Platform, FlatList } from 'react-native';
import images from '../../component/images';
import { DrawerActions, useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import CallLogs from "react-native-call-log";
import UserAvatar from 'react-native-user-avatar';
import Realm from "realm";
import moment from 'moment';

const CallDetailsSchema = {
    name: 'incoming_call_detailsTable',
    primaryKey: 'id',
    properties: {
        id: 'int',
        phone: 'string',
        name: 'string',
        call_date: 'string',
        start_date: 'string',
        end_date: 'string',
        is_sync: 'string',
        type: 'string',
    },
};

const CallScreen = ({ navigation }) => {

    const [callLogs, setCallLogs] = useState([]);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const isFocused = useIsFocused();



    useFocusEffect(
        useCallback(() => {
            fetchCallLogs();
        }, [])
    );

    useEffect(() => {
        if (Platform.OS === 'android') {
            requestCallLogPermission();
        }
    }, []);

    const requestCallLogPermission = async () => {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
                {
                    title: "Call Log Permission",
                    message: "This app needs access to your call logs",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK"
                }
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                setPermissionGranted(true);
                fetchCallLogs();
            } else {
                console.log("Call Log permission denied");
            }
        } catch (err) {
            console.warn(err);
        }
    };


    const fetchCallLogs = async () => {
        try {
            const logs = await CallLogs.load(100); // Fetch call logs
            const outgoingCalls = await getAllRecords(); // Fetch outgoing calls from the database

            // Filter logs for INCOMING and MISSED calls
            const filteredLogs = logs.filter((log) => {
                const callType = log.type;
                const callDate = moment(parseInt(log.timestamp)); // Parse the timestamp with moment
                const callHour = callDate.hours();
                const dayOfWeek = callDate.day(); // Get the day of the week
                const isInTimeRange = (callHour >= 8 && callHour <= 21);
                const isWeekday = (dayOfWeek >= 1 && dayOfWeek <= 5); // Monday to Friday are days 1 to 5
                return (
                    (callType === 'INCOMING' || callType === 'MISSED') &&
                    isInTimeRange &&
                    isWeekday
                );
            });

            const combinedLogs = [...filteredLogs];

            // Check for OUTGOING calls in the database
            outgoingCalls.forEach((outgoing) => {
                // Explicitly parse the outgoing.call_date with the correct format
                const outgoingDate = moment(outgoing.call_date, "MMM D, YYYY HH:mm:ss", true); // Use the specified format
                const outgoingDateString = outgoingDate.format('YYYY-MM-DD'); // Format for comparison
                console.log('date from database', outgoingDateString);


                // Look for matching OUTGOING logs in the CallLogs
                const matchingOutgoingLogs = logs.filter((log) => {
                    console.log('log data', log); // Log the entire log object
                    console.log('log.dateTime', log.dateTime); // Log the original dateTime to see its actual format

                    // Use moment to parse dateTime with the correct format
                    const logDate = moment(log.dateTime, "MMM D, YYYY h:mm:ss A", true); // Note the use of 'h:mm:ss A' for 12-hour format with AM/PM
                    console.log('Parsed log date:', logDate); // Log the parsed date object

                    const logDateString = logDate.format('YYYY-MM-DD'); // Format for comparison
                    console.log('call log date string', logDateString);

                    return logDateString === outgoingDateString && log.type === 'OUTGOING'; // Compare dates and ensure type is OUTGOING
                });


                // If matching OUTGOING logs are found, add them to combinedLogs
                if (matchingOutgoingLogs.length > 0) {
                    matchingOutgoingLogs.forEach(log => {
                        combinedLogs.push({
                            type: 'OUTGOING',
                            phoneNumber: log.phoneNumber, // Assuming phoneNumber is available in log
                            dateTime: log.dateTime, // Use dateTime from CallLogs
                        });
                    });
                }
            });

            // Update state with combined logs
            setCallLogs(combinedLogs);
        } catch (e) {
            console.error(e);
        }
    };


    const getAllRecords = async () => {
        try {
            const realm = await Realm.open({
                path: 'calling_detailsDatabase.realm',
                schema: [CallDetailsSchema],
            });
            const allRecords = realm.objects('incoming_call_detailsTable');
            return Array.from(allRecords); // Convert to array for easier manipulation
        } catch (error) {
            console.error('Error retrieving records:', error);
            return [];
        }
    };



    const renderCallLog = ({ item }) => {

        return (
            <View style={{ margin: 20, }}>
                <View style={styles.cont}>
                    <View style={styles.cont1}>
                        <View style={{ marginTop: 10 }}>
                            <UserAvatar size={30} name={item.name === '' ? 'Unknown' : item.name} />
                        </View>
                        <View style={{ marginLeft: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: "black" }}>{item?.name === '' ? 'Unknown' : item.name}</Text>
                            <Text style={{ fontSize: 14, color: 'black' }}>{item?.phoneNumber}</Text>
                            <Text style={{ fontSize: 12, color: 'grey' }}>{item?.dateTime}</Text>
                        </View>
                    </View>
                    <View>
                        <View style={{ flexDirection: 'row', top: 10 }}>
                            <Image source={item.type === 'INCOMING' ? images.incoming : item.type === 'OUTGOING' ? images.outgoing : images.missed} style={{ height: 25, width: 25, right: 40 }} />
                            <Image source={images.call} style={{ height: 25, width: 25, tintColor: 'black' }} />
                        </View>
                    </View>
                </View>
                <View style={{ borderWidth: 0.5, borderColor: '#DDDDDD', width: '90%', alignSelf: 'center', top: 10 }} />
            </View>
        );
    };


    return (
        <View style={styles.main}>
            <View style={[styles.headerContainer, styles.margin]}>
                <View style={styles.leftHeader}>
                    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} >
                        <Image source={images.menu} style={styles.icon} />
                    </TouchableOpacity>
                    <Text style={styles.homeText}>Home</Text>
                </View>
                <View style={styles.rightHeader}>
                    <View style={styles.usyncContainer}>
                        <Text style={styles.usyncText}>Usync</Text>
                        <View style={styles.counterContainer}>
                            <Text style={styles.counterText}>0</Text>
                        </View>
                    </View>
                    <Image source={images.refresh} style={styles.icon} />
                </View>
            </View>
            <View style={styles.line} />


            <View style={{ marginLeft: 20, marginTop: 20 }}>
                <Text style={styles.txt}>Recent</Text>
            </View>


            <View>
                {permissionGranted ? (
                    <FlatList
                        data={callLogs}
                        renderItem={renderCallLog}
                        keyExtractor={(item, index) => index.toString()}
                        style={{ marginTop: 20 }}
                    />
                ) : (
                    <View style={{ top: 300 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>Permission not granted to access call logs.</Text>
                    </View>
                )}
            </View>


            <TouchableOpacity style={styles.createGroup} onPress={() => navigation.navigate('DialScreen')} >
                <Image source={images.dial} style={{ height: 28, width: 28, tintColor: 'white', top: 3 }} />
            </TouchableOpacity>

        </View>
    );
};

export default CallScreen;

const styles = StyleSheet.create({
    main: {
        flex: 1,
        backgroundColor: 'white',
    },
    margin: {
        marginTop: 20,
        marginLeft: 20,
        marginRight: 20,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    homeText: {
        color: 'black',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    rightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    usyncContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    usyncText: {
        color: 'black',
        fontSize: 14,
        marginRight: 8,
    },
    counterContainer: {
        backgroundColor: 'blue',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        height: 25,
        width: 25,
    },
    counterText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 14,
    },
    icon: {
        height: 20,
        width: 20,
    },
    line: {
        borderWidth: 0.2,
        width: '100%',
        borderColor: "#DDDDDD",
        top: 8
    },
    createGroup: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        width: 55,
        height: 55,
        backgroundColor: 'blue', // Customize color
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5, // For shadow on Android
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
    },
    txt: {
        color: 'black',
        fontSize: 16,
        fontWeight: '500',
        top: 10
    },
    cont: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        // marginLeft: 16,
        // marginRight: 16
    },
    cont1: {
        flexDirection: 'row'
    }
});
