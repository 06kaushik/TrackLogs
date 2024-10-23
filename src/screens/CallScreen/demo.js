import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, Image, TouchableOpacity, PermissionsAndroid, Platform, FlatList, Alert, ToastAndroid, AppState } from 'react-native';
import images from '../../component/images';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import CallLogs from "react-native-call-log";
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImmediatePhoneCall from 'react-native-immediate-phone-call';


const syncDataApi = 'https://tracklog.live/api/v1/calls/add';
const callHistory = 'https://tracklog.live/api/v1/calls/history'

const CallScreen = ({ navigation }) => {

    const [callLogs, setCallLogs] = useState([]);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [todayCallLogs, setTodayCallLogs] = useState([]);
    const [userdetail, setUserDetails] = useState({});
    const [callhistory, setCallHistory] = useState([])
    const [currentdatefromdatabase, setCurrentDatedatafromDatabase] = useState([])
    const [unmatchedCount, setUnmatchedCount] = useState(0);
    //('unmatched counts', unmatchedCount);
    const [appState, setAppState] = useState(AppState.currentState);
    //('status of app state', appState);


    useEffect(() => {
        setInterval(() => {
            //('setinterval in every 5 sec');

            fetchTodayCallLogs();

        }, 1000);
    }, [])

    useEffect(() => {
        //('unmatched count update');
        const newLogsCount = compareCallLogs(currentdatefromdatabase, todayCallLogs);
        setUnmatchedCount(newLogsCount);
    }, [currentdatefromdatabase, todayCallLogs, appState, userdetail]);


    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                fetchCallLogs();
                fetchTodayCallLogs();
                compareCallLogs();
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
            fetchCallLogs();
            fetchTodayCallLogs()
            compareCallLogs()
        }, [])
    );

    useEffect(() => {
        getUserInfo();
    }, []);

    useEffect(() => {
        CallHistory_API()
        compareCallLogs()
        fetchTodayCallLogs()
    }, [userdetail?.id,])

    useEffect(() => {
        if (Platform.OS === 'android') {
            requestCallLogPermission();
        }
    }, []);




    const compareCallLogs = (databaseLogs, todayLogs) => {
        const databaseTimestamps = new Set(databaseLogs?.map(log => log.timestamp));
        const newLogsCount = todayLogs?.reduce((count, log) => {
            return databaseTimestamps.has(log.timestamp) ? count : count + 1;
        }, 0);
        return newLogsCount;
    };

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
                //("Call Log permission denied");
            }
        } catch (err) {
            console.warn('permission error', err);
        }
    };

    const fetchCallLogs = async () => {
        try {
            const logs = await CallLogs.load(100);
            const filteredLogs = logs?.filter((log) => {
                const callType = log.type;
                const callDate = moment(parseInt(log.timestamp));
                const callHour = callDate.hours();
                const dayOfWeek = callDate.day();
                const isInTimeRange = (callHour >= 9 && callHour <= 21);
                const isWeekday = (dayOfWeek >= 1 && dayOfWeek <= 5);
                return (
                    (callType === 'INCOMING' || callType === 'MISSED' || callType === 'OUTGOING') &&
                    isInTimeRange &&
                    isWeekday
                );
            });

            await AsyncStorage.setItem('callLogs', JSON.stringify(filteredLogs));
            const storedLogs = await AsyncStorage.getItem('callLogs');
            // //('Stored call logs in AsyncStorage:', JSON.parse(storedLogs));
            setCallLogs(filteredLogs);

        } catch (e) {
            console.error('fetchCallLogs function error', e);
        }
    };

    const fetchTodayCallLogs = async () => {
        try {
            const storedLogs = await AsyncStorage.getItem('callLogs');
            if (storedLogs) {
                const logs = JSON.parse(storedLogs);
                const currentDate = moment().format('YYYY-MM-DD');

                const filteredLogs = logs?.filter(log => {
                    const logDate = moment(parseInt(log.timestamp)).format('YYYY-MM-DD');  // Format the timestamp directly
                    return logDate === currentDate;
                });

                // Debugging step: Check the filtered logs
                // //('Today\'s Call Logs:', filteredLogs);

                setTodayCallLogs(filteredLogs);
            }
        } catch (e) {
            console.error('fetchTodayCallLogs function error', e);
        }
    };

    const syncCallLogs = async () => {

        if (unmatchedCount === 0) {
            Alert.alert('No Data', 'There are no call logs to sync');
            return;
        }
        try {
            const response = await Promise.all(todayCallLogs.map(async (log) => {
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
                return await SyncData_API(syncData);
            }));

            const allSuccess = response.every(res => res.success);
            if (allSuccess) {
                setTodayCallLogs([]); // Empty the state
                Alert.alert('Success', 'Call logs synced successfully');
                await fetchNewCallLogs(); // This will update todayCallLogs with new data
                setTodayCallLogs([]); // Ensure the state is emptied after sync
            } else {
                // Alert.alert('Error', 'Some call logs failed to sync');
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
            compareCallLogs()
            CallHistory_API()
            fetchTodayCallLogs()
            ToastAndroid.show('Data Sync Successfully', ToastAndroid.SHORT);
            await AsyncStorage.removeItem('callLogs');
            return data;
        } catch (error) {
            console.error('Error from the sync data:', error);
            return { success: false };
        }
    };

    const fetchNewCallLogs = async () => {
        try {
            const newLogs = await fetchCallLogs();
            const filteredNewLogs = newLogs?.filter(newLog =>
                !todayCallLogs.some(existingLog => existingLog.timestamp === newLog.timestamp)
            );
            if (filteredNewLogs?.length > 0) {
                const updatedLogs = [...filteredNewLogs];
                setTodayCallLogs(updatedLogs);
                await AsyncStorage.setItem('callLogs', JSON.stringify(updatedLogs));
            }
        } catch (error) {
            console.error('Error fetching new call logs:', error);
        }
    };


    const CallHistory_API = async () => {
        try {
            let options = {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                method: 'POST'
            };
            options.body = new FormData();
            options.body.append("user_id", userdetail.id);
            options.body.append("password", userdetail.password);
            options.body.append("company_id", userdetail.company_id);

            let response = await fetch(callHistory, options);
            let data = await response.json();
            // //('Response from the call history', data.data.length);
            setCallHistory(data);

            // Get today's date, yesterday's date, and last week's date
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);

            // Function to format dates to YYYY-MM-DD
            const formatDate = (date) => date.toISOString().split('T')[0];

            // Filtering the data
            const currentDateCalls = data?.data?.filter(call => {
                const callDate = new Date(call.date_time);
                return formatDate(callDate) === formatDate(today);
            });

            const yesterdayCalls = data?.data?.filter(call => {
                const callDate = new Date(call.date_time);
                return formatDate(callDate) === formatDate(yesterday);
            });

            const lastWeekCalls = data?.data?.filter(call => {
                const callDate = new Date(call.date_time);
                return callDate >= lastWeek && callDate < today;
            });

            setCurrentDatedatafromDatabase(currentDateCalls)
            // Log or handle the filtered data as needed
            // //('Calls Today:', currentDateCalls?.length);
            // //('Calls Yesterday:', yesterdayCalls);
            // //('Calls Last Week:', lastWeekCalls);

            return {
                currentDateCalls,
                yesterdayCalls,
                lastWeekCalls
            };

        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const savePhoneNumberToStorage = async (number) => {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss'); // Get current timestamp
        try {
            // Retrieve existing call data
            const existingData = await AsyncStorage.getItem('callData');
            const callData = existingData ? JSON.parse(existingData) : []; // Parse or initialize

            // Add new entry
            callData.push({ phoneNumber: number, timeStamp: timestamp });

            // Save updated call data back to AsyncStorage
            await AsyncStorage.setItem('callData', JSON.stringify(callData));
            console.log('Saved call data to AsyncStorage in callScreen:', callData);
        } catch (error) {
            console.error('Failed to save the call data:', error);
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

        return (
            <View style={{ margin: 20, }}>
                <View style={styles.cont}>
                    <View style={styles.cont1}>
                        <View style={{ marginTop: 10 }}>
                            {/* <UserAvatar size={30} name={item.name === '' ? 'Unknown' : item.name} /> */}
                            <Image style={{ height: 30, width: 30 }} source={images.profile} />
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
                            <Text style={styles.counterText}>{unmatchedCount}</Text>
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
