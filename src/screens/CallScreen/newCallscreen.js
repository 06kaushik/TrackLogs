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
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [calldataoutgoing, setCallDataOutgoing] = useState([]);
    const [outgoingCallsToday, setOutgoingCallsToday] = useState([]);
    const [incomingCount, setIncomingCount] = useState(0);
    const [synccount, setSyncCount] = useState(0)
    const [clickedItems, setClickedItems] = useState([]);
    const [appState, setAppState] = useState(AppState.currentState);
    const [userdetail, setUserDetails] = useState({});




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
            const logs = await CallLogs.load(20); // Fetch the latest 5 call logs
            const realm = await Realm.open({ schema: [CallDataSchema] });
            const savedCallData = realm.objects('CallData');
            const filteredLogs = logs.filter((log) => {
                if (log.type === 'INCOMING') {
                    return true;
                } else if (log.type === 'OUTGOING') {
                    return savedCallData.some(savedCall => savedCall.dateTime === log.dateTime);
                }
                return false;
            });
            setCallLogs(filteredLogs);
            filterOutgoingCalls(filteredLogs)
            realm.close();
        } catch (e) {
            console.error('fetchCallLogs function error', e);
        }
    };

    const savePhoneNumberToStorage = async (number) => {
        const timestamp = moment().format('MMM DD, YYYY h:mm:ss A');
        const realm = await Realm.open({ schema: [CallDataSchema] });

        try {
            const lastCall = realm.objects('CallData').sorted('_id', true)[0];
            const newId = lastCall ? lastCall._id + 1 : 1;

            realm.write(() => {
                realm.create('CallData', {
                    _id: newId,
                    phoneNumber: number,
                    dateTime: timestamp,
                });
            });

            const callData = realm.objects('CallData');

            setCallDataOutgoing(callData);

            console.log('Data saved in Realm:', callData);
        } catch (error) {
            console.error('Failed to save call data in Realm:', error);
        } finally {
            realm.close();
        }
    };


    const filterOutgoingCalls = (logs) => {
        const today = moment().startOf('day');
        const filteredOutgoingCalls = logs.filter(log => {
            const logDate = moment(log.dateTime, 'MMM D, YYYY h:mm:ss A');
            return log.type === 'OUTGOING' && logDate.isSame(today, 'day');
        });
        console.log('Filtered Outgoing Calls:');
        setOutgoingCallsToday(filteredOutgoingCalls);
    };


    const handleIncomingCountIncrement = async (incomingCall) => {
        setIncomingCount(prevCount => prevCount + 1);
        setOutgoingCallsToday(prevCalls => {
            const updatedCalls = [...prevCalls, incomingCall];
            console.log('Updated Calls Before Storing:');
            storeFinalData(updatedCalls);
            fetchStoredData()
            return updatedCalls;
        });
        setClickedItems(prevClicked => [...prevClicked, incomingCall.timestamp]);
    };

    const storeFinalData = async (data) => {
        try {
            await AsyncStorage.setItem('finaldata', JSON.stringify(data));
            console.log('Data stored successfully:'); // Log stored data
        } catch (error) {
            console.error('Error storing data:', error);
        }
    };

    const fetchStoredData = async () => {
        try {
            const storedData = await AsyncStorage.getItem('finaldata');
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                console.log('Fetched Data from AsyncStorage:', parsedData);
                const uniqueData = Array.from(new Map(parsedData.map(item => [item.timestamp, item])).values());
                setSyncCount(uniqueData.length);
                setOutgoingCallsToday(uniqueData);
            }
        } catch (error) {
            console.error('Error retrieving data:', error);
        }
    };

    const syncCallLogs = async () => {
        if (synccount === 0 || undefined) {
            Alert.alert('No Data', 'There are no call logs to sync');
            return;
        }

        try {
            // Sync each call log to the server
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

                console.log('response from the data to sync', syncData);
                return await SyncData_API(syncData);
            }));

            // Check if all call logs were successfully synced
            const allSuccess = response.every(res => res.success);
            if (allSuccess) {
                Alert.alert('Success', 'Call logs synced successfully');

                // Clear AsyncStorage after successful sync
                await AsyncStorage.removeItem('finaldata');
                console.log('AsyncStorage cleared');

                // Clear Realm database
                const realm = await Realm.open({ schema: [CallDataSchema] });
                realm.write(() => {
                    const allCalls = realm.objects('CallData');
                    realm.delete(allCalls);  // Deletes all CallData records from Realm
                });
                realm.close();
                console.log('Realm database cleared');

                // Reset the sync count
                setSyncCount(0);
                setOutgoingCallsToday([]); // Clear outgoing call logs
            } else {
                Alert.alert('Error', 'Some call logs failed to sync');
            }
        } catch (error) {
            console.error('Sync error:', error);
            Alert.alert('Error', 'Failed to sync call logs');
        }
    };



    const SyncData_API = async (syncData) => {
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
            console.log('response from the data ', data);

            ToastAndroid.show('Data Sync Successfully', ToastAndroid.SHORT);
            await AsyncStorage.removeItem('finaldata');
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
            const today = moment().startOf('day');
            const logDate = moment(dateTime, 'MMM D, YYYY h:mm:ss A'); // Adjust format as needed
            return logDate.isSame(today, 'day');
        };

        return (
            <View style={{ margin: 20 }}>
                <View style={styles.cont}>
                    <View style={styles.cont1}>
                        <View style={{ marginTop: 10 }}>
                            <Image style={{ height: 30, width: 30 }} source={images.profile} />
                        </View>
                        <View style={{ marginLeft: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: "black" }}>{item?.name === '' ? 'Unknown' : item.name}</Text>
                            <Text style={{ fontSize: 14, color: 'black' }}>{item?.phoneNumber}</Text>
                            <Text style={{ fontSize: 12, color: 'grey' }}>{item?.dateTime}</Text>
                        </View>
                        {item?.type === 'INCOMING' && isToday(item.dateTime) && !clickedItems.includes(item.timestamp) ? (
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
                <View style={styles.rightHeader}>
                    <View style={styles.usyncContainer}>
                        <TouchableOpacity onPress={() => syncCallLogs()}>
                            <Text style={styles.usyncText}>Usync</Text>
                        </TouchableOpacity>
                        <View style={styles.counterContainer}>
                            <Text style={styles.counterText}>{synccount}</Text>
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
