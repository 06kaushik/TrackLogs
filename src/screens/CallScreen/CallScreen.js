import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, Image, TouchableOpacity, PermissionsAndroid, Platform, FlatList, Alert, ToastAndroid, AppState } from 'react-native';
import images from '../../component/images';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import CallLogs from "react-native-call-log";
import moment from 'moment';
import Realm from 'realm';
import { RealmProvider } from '@realm/react';
import ImmediatePhoneCall from 'react-native-immediate-phone-call';
import AsyncStorage from "@react-native-async-storage/async-storage";




const syncDataApi = 'https://tracklog.live/api/v1/calls/add';
const callHistory = 'https://tracklog.live/api/v1/calls/history'

// Define Realm Schema
const CallDataSchema = {
    name: 'CallData',
    properties: {
        _id: 'int',
        phoneNumber: 'string',
        dateTime: 'string',

    },
    primaryKey: '_id',
};

const CallScreen = ({ navigation }) => {

    const [callLogs, setCallLogs] = useState([]);
    //('call logs filteres', callLogs);

    const [permissionGranted, setPermissionGranted] = useState(false);
    const [calldataoutgoing, setCallDataOutgoing] = useState([]);
    //('count of outgoing', typeof calldataoutgoing);

    const [outgoingCallsToday, setOutgoingCallsToday] = useState([]);

    const [incomingCount, setIncomingCount] = useState(0);
    //('incoming count', typeof incomingCount);

    const [synccount, setSyncCount] = useState(0)
    const [clickedItems, setClickedItems] = useState([]);
    const [appState, setAppState] = useState(AppState.currentState);
    const [userdetail, setUserDetails] = useState({});


    useEffect(() => {
        setInterval(() => {
            //('setinterval in every 5 sec');
            getRealmAsynData()

        }, 1000);
    }, [])



    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                fetchCallLogs()
                fetchStoredData()
            }
            setAppState(nextAppState);
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, []);


    useFocusEffect(
        useCallback(() => {
            fetchCallLogs()
            fetchStoredData()
        }, [])
    );

    useEffect(() => {
        getUserInfo();
        getRealmAsynData()
    }, []);


    useEffect(() => {
        if (Platform.OS === 'android') {
            requestCallLogPermission();
        }
    }, []);

    const getUserInfo = async () => {
        try {
            const data = await AsyncStorage.getItem('userData');
            if (data) {
                const parsedData = JSON.parse(data);
                setUserDetails(parsedData);
            } else {
            }
        } catch (error) {
            //('Error fetching user data:', error);
        }
    };

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
                // Handle permission denial
            }
        } catch (err) {
            console.warn('permission error', err);
        }
    };

    const fetchCallLogs = async () => {
        try {
            // Fetch raw call logs
            const logs = await CallLogs.load(100);
            //('Raw Call Logs:', logs);

            // Open Realm and fetch saved data
            const realm = await Realm.open({ schema: [CallDataSchema] });
            const savedCallData = realm.objects('CallData');
            //('Saved Realm Data:', savedCallData);

            // Helper function to format dateTime to exclude seconds
            const formatDateTime = (dateTime) => {
                return moment(dateTime).format('DD-MMM-YYYY HH:mm'); // Format to exclude seconds
            };

            // Filter call logs based on the criteria
            const filteredLogs = logs.filter(log => {
                if (log.type === 'INCOMING') {
                    // Always return incoming calls
                    return true;
                } else if (log.type === 'OUTGOING') {
                    // Format the log's dateTime to compare
                    const logFormatted = formatDateTime(log.dateTime);
                    //(`Log Formatted (OUTGOING): ${logFormatted}`);

                    const matched = savedCallData.some(savedCall => {
                        // Format the saved call's dateTime to compare
                        const savedFormatted = formatDateTime(savedCall.dateTime);
                        //(`Comparing log (${logFormatted}) with saved (${savedFormatted})`);

                        // Compare formatted dateTimes
                        return logFormatted === savedFormatted;
                    });

                    return matched; // Return true if there's a match in Realm data
                }
                return false;
            });

            //('Filtered Data:', filteredLogs);

            // Update state with the filtered call logs
            setCallLogs(filteredLogs);
            filterOutgoingCalls(filteredLogs);

            // Close the Realm instance after use
            realm.close();
        } catch (error) {
            console.error('Error in fetchCallLogs:', error);
        }
    };


    const savePhoneNumberToStorage = async (number) => {
        // const dateTime = moment().format('MMM DD, YYYY h:mm:ss A');
        const dateTime = moment().format('DD-MMM-YYYY HH:mm:ss')
        //('datetimee', dateTime);

        const realm = await Realm.open({ schema: [CallDataSchema] });
        try {
            const lastCall = realm.objects('CallData').sorted('_id', true)[0];
            const newId = lastCall ? lastCall._id + 1 : 1;
            realm.write(() => {
                realm.create('CallData', {
                    _id: newId,
                    phoneNumber: number,
                    dateTime: dateTime,
                });
            });
            const existingData = await AsyncStorage.getItem('realmDataoutgoing');
            const existingCallData = existingData ? JSON.parse(existingData) : [];
            const isExisting = existingCallData.some(call => call._id === newId);
            if (!isExisting) {
                await AsyncStorage.setItem('realmDataoutgoing', JSON.stringify([...existingCallData, { _id: newId, phoneNumber: number, dateTime: dateTime }]));
            } else {
            }
        } catch (error) {
            console.error('Failed to save call data in Realm:', error);
        } finally {
            realm.close();
        }
    };


    const getRealmAsynData = async () => {
        const data = await AsyncStorage.getItem('realmDataoutgoing');
        // //('data of realm in async', data);
        if (data) {
            const parsedData = JSON.parse(data);
            setCallDataOutgoing(parsedData.length);
        } else {
            setCallDataOutgoing(0); // Set to 0 if no data found
        }
    };

    const filterOutgoingCalls = (logs) => {
        // //('filteroutgoing callsssss', logs);

        const today = moment().startOf('day');
        const filteredOutgoingCalls = logs.filter(log => {
            const logDate = moment(log.dateTime, 'DD-MMM-YYYY HH:mm:ss');
            //('>>>>>>>>>logDate', logDate);

            return log.type === 'OUTGOING' && logDate.isSame(today, 'day');
        });
        //('Filtered Outgoing Calls:>>>>aat the end of the function', filteredOutgoingCalls);
        setOutgoingCallsToday(filteredOutgoingCalls);
    };


    const handleIncomingCountIncrement = async (incomingCall) => {
        setIncomingCount(prevCount => prevCount + 1);
        setOutgoingCallsToday(prevCalls => {
            const updatedCalls = [...prevCalls, incomingCall];
            //('Updated Calls Before Storing:', updatedCalls);
            storeFinalData(updatedCalls);
            fetchStoredData()
            return updatedCalls;
        });
        setClickedItems(prevClicked => [...prevClicked, incomingCall.timestamp]);
    };

    const storeFinalData = async (data) => {
        try {
            await AsyncStorage.setItem('finaldata', JSON.stringify(data));
        } catch (error) {
            console.error('Error storing data:', error);
        }
    };

    const fetchStoredData = async () => {
        try {
            const storedData = await AsyncStorage.getItem('finaldata');
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                // //('Fetched Data from AsyncStorage:', parsedData);
                const uniqueData = Array.from(new Map(parsedData.map(item => [item.timestamp, item])).values());
                console.log('uniqu merged data', uniqueData);
                setSyncCount(uniqueData.length);
                setOutgoingCallsToday(uniqueData);
            }
        } catch (error) {
            console.error('Error retrieving data:', error);
        }
    };

    const syncCallLogs = async () => {
        // Log outgoing calls before checking counts
        //('Outgoing Calls Before Sync:', outgoingCallsToday);

        // Check if there are any incoming or outgoing call logs to sync
        if (calldataoutgoing === 0) {
            Alert.alert('No Data', 'There are no outgoing call logs to sync');
            return;
        }

        try {
            // Sync each outgoing call log to the server
            const response = await Promise.all(outgoingCallsToday.map(async (log) => {
                const syncData = {
                    user_id: userdetail?.id,
                    password: userdetail?.password,
                    local_db_id: log.timestamp,
                    date_time: log.dateTime,
                    duration: log.duration,
                    name: log.name,
                    phone_number: log.phoneNumber,
                    timestamp: log.timestamp,
                    call_type: log.type,
                    company_id: userdetail?.company_id,
                };

                // Log the sync data for debugging
                //('Sync Data:', syncData);
                const apiResponse = await SyncData_API(syncData);
                //('API Response:', apiResponse); // Log the response from the API

                return apiResponse; // Return the API response to check later
            }));

            // Check if all call logs were successfully synced
            const allSuccess = response.every(res => res.success); // Ensure response has a 'success' property
            if (allSuccess) {
                Alert.alert('Success', 'Call logs synced successfully');
                setSyncCount(0);
                setCallDataOutgoing(0);
                setIncomingCount(0);
                setOutgoingCallsToday([]); // Clear outgoing call logs
            } else {
                // Alert.alert('Warning', 'Some call logs failed to sync');
            }

        } catch (error) {
            console.error('Sync error:', error);
            Alert.alert('Error', 'Failed to sync call logs');
        }
    };



    const SyncData_API = async (syncData) => {
        //('in syndata apiiii');

        try {
            let options = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                method: 'POST',
            };
            options.body = new FormData();
            options.body.append('user_id', syncData.user_id);
            options.body.append('password', syncData.password);
            options.body.append('local_db_id', syncData.local_db_id);
            options.body.append('date_time', syncData.date_time);
            options.body.append('duration', syncData.duration);
            options.body.append('name', syncData.name);
            options.body.append('phone_number', syncData.phone_number);
            options.body.append('timestamp', syncData.timestamp);
            options.body.append('call_type', syncData.call_type);
            options.body.append('company_id', syncData.company_id);

            const response = await fetch(syncDataApi, options);
            const data = await response.json();
            //('response from the data ', data);
            // Clear Realm database
            // const realm = await Realm.open({ schema: [CallDataSchema] });
            // realm.write(() => {
            //     const allCalls = realm.objects('CallData');
            //     realm.delete(allCalls);  // Deletes all CallData records from Realm
            // });
            // realm.close();
            // //('Realm database cleared');

            // Check remaining records in Realm
            // await checkRealmRecords();
            ToastAndroid.show('Data Sync Successfully', ToastAndroid.SHORT);
            await AsyncStorage.removeItem('finaldata');
            await AsyncStorage.removeItem('realmDataoutgoing');

            setSyncCount(0);
            setCallDataOutgoing(0)
            setIncomingCount(0)
            setOutgoingCallsToday([]); // Clear outgoing call logs
            return data;
        } catch (error) {
            console.error('Error from the sync data:', error);
            return { success: false };
        }
    };

    const renderCallLog = ({ item }) => {


        const handleCallPress = async (phoneNumber) => {
            try {
                ImmediatePhoneCall.immediatePhoneCall(phoneNumber);
                await savePhoneNumberToStorage(phoneNumber);
            } catch (error) {
                console.error('Error making immediate phone call:', error);
            }
        };

        const isToday = (dateTime) => {
            const today = moment().startOf('day'); // Start of today's date
            let logDate = moment(dateTime, 'DD-MMM-YYYY HH:mm:ss', true); // First format
            if (!logDate.isValid()) {
                logDate = moment(dateTime, 'MMM D, YYYY h:mm:ss A', true); // Fallback format
            }
            if (!logDate.isValid()) {
                console.warn('Invalid date format:', dateTime); // Log if neither format works
                return false; // Consider it not today if parsing fails
            }
            return logDate.isSame(today, 'day'); // Check if logDate is the same as today
        };

        return (
            <View style={{ margin: 20 }}>
                <View style={styles.cont}>
                    <View style={styles.cont1}>
                        <View style={{ marginTop: 10 }}>
                            <Image style={{ height: 30, width: 30 }} source={images.profile} />
                        </View>
                        <View style={{ marginLeft: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: "black" }}>
                                {item?.name ? item.name : 'Unknown'}
                            </Text>
                            <Text style={{ fontSize: 14, color: 'black' }}>{item?.phoneNumber}</Text>
                            <Text style={{ fontSize: 12, color: 'grey' }}>{item?.dateTime}</Text>
                        </View>
                        {item?.type === 'INCOMING' && !clickedItems.includes(item.timestamp) ? (
                            <TouchableOpacity onPress={() => handleIncomingCountIncrement(item)}>
                                <Image source={images.plus} style={{ height: 20, width: 20 }} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <View>
                        <View style={{ flexDirection: 'row', top: 10 }}>
                            <Image source={item.type === 'INCOMING' ? images.incoming : item.type === 'OUTGOING' ? images.outgoing : images.missed} style={{ height: 25, width: 25, right: 40 }} />
                            <TouchableOpacity onPress={() => handleCallPress(item.phoneNumber)}>
                                <Image source={images.call} style={{ height: 25, width: 25, tintColor: 'black' }} />
                            </TouchableOpacity>
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
                    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
                        <Image source={images.menu} style={styles.icon} />
                    </TouchableOpacity>
                    <Text style={styles.homeText}>Home</Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        if ((calldataoutgoing + incomingCount) < 5) {
                            Alert.alert(
                                'Sync Error',
                                'Both incoming and outgoing counts should be more than 5'
                            );
                        } else {
                            syncCallLogs();
                        }
                    }}>
                    <View style={styles.rightHeader}>
                        <View style={styles.usyncContainer}>
                            <Text style={styles.usyncText}>Usync</Text>
                            <View style={styles.counterContainer}>
                                <Text style={styles.counterText}>{calldataoutgoing + incomingCount}</Text>
                            </View>
                        </View>
                        <Image source={images.refresh} style={styles.icon} />
                    </View>
                </TouchableOpacity>

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

            <TouchableOpacity style={styles.createGroup} onPress={() => navigation.navigate('DialScreen')}>
                <Image source={images.dial} style={{ height: 28, width: 28, tintColor: 'white', top: 3 }} />
            </TouchableOpacity>
        </View>
    );
};

const CallScreenWrapper = ({ navigation }) => {
    return (
        <RealmProvider schema={[CallDataSchema]}>
            <CallScreen navigation={navigation} />
        </RealmProvider>
    );
};

export default CallScreenWrapper;

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
