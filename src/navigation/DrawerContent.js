import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { DrawerContentScrollView, useDrawerStatus } from '@react-navigation/drawer';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SwipeButton from 'rn-swipe-button';
import images from '../component/images';
import arrowright from '../assets/arrowright.png';
import { ContextApi } from '../component/ContextApi';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';




const callHistory = 'https://tracklog.live/api/v1/calls/history '

const DrawerContent = ({ props, navigation }) => {
    const [userdetail, setUserDetails] = useState({});
    const [showBox, setShowBox] = useState(true);
    const { logout } = useContext(ContextApi)
    const [currentdatefromdatabase, setCurrentDatedatafromDatabase] = useState([])
    const [totalDuration, setTotalDuration] = useState({ minutes: 0, seconds: 0 });
    const [connectedCallsCount, setConnectedCallsCount] = useState(0);
    const [yesterdaycalls, setYesterdayCalls] = useState([])
    const [totalYesterdayDuration, setTotalYesterdayDuration] = useState({ minutes: 0, seconds: 0 });
    const [lastweekcalls, setLastWeekCalls] = useState([])
    const [totalLastWeekDuration, setTotalLastWeekDuration] = useState({ minutes: 0, seconds: 0 })
    const [uniqueCallsCount, setUniqueCallsCount] = useState(0);
    const isDrawerOpen = useDrawerStatus() === 'open';




    useEffect(() => {
        if (isDrawerOpen) {
            //('drwaer is opened');

            CallHistory_API();
            getUserInfo();
        }
    }, [isDrawerOpen]);

    useEffect(() => {
        if (Array.isArray(currentdatefromdatabase) && currentdatefromdatabase.length > 0) {
            const totalDurations = currentdatefromdatabase.reduce((acc, item) => {
                const duration = parseInt(item.duration, 10); // Convert duration to a number
                if (!isNaN(duration) && duration > 0) { // Check if duration is valid
                    acc.sum += duration;  // Add duration to the sum
                    acc.count += 1;       // Increment the count for non-zero durations
                }
                return acc;
            }, { sum: 0, count: 0 });

            // Set the connected calls count
            setConnectedCallsCount(totalDurations.count);

            // Convert the total sum of durations from seconds to minutes and seconds
            const minutes = Math.floor(totalDurations.sum / 60);  // Get the whole minutes
            const seconds = totalDurations.sum % 60;              // Get the remaining seconds
            setTotalDuration({ minutes, seconds });

            // Calculate unique calls
            const uniqueNumbers = new Set(currentdatefromdatabase.map(item => item.phoneNumber)); // Use the phoneNumber field to get unique calls
            setUniqueCallsCount(uniqueNumbers.size); // Set the unique calls count

            //("Total Duration:", `${minutes}m ${seconds}s`);
            //("Count of Connected Calls:", totalDurations.count);
            //("Count of Unique Calls:", uniqueNumbers.size); // Log unique calls count
        } else {
            //("No data available in currentdatefromdatabase");
        }
    }, [currentdatefromdatabase]);
    useEffect(() => {
        if (Array.isArray(yesterdaycalls) && yesterdaycalls.length > 0) {
            const totalDurations = yesterdaycalls.reduce((acc, item) => {
                const duration = parseInt(item.duration, 10);
                if (!isNaN(duration) && duration > 0) {
                    acc.sum += duration;
                }
                return acc;
            }, { sum: 0 });

            // Convert total durations into minutes and seconds
            const minutes = Math.floor(totalDurations.sum / 60);
            const seconds = totalDurations.sum % 60;
            setTotalYesterdayDuration({ minutes, seconds });
        } else {
            //("No data available in yesterdaycalls");
        }
    }, [yesterdaycalls]);

    useEffect(() => {
        if (Array.isArray(lastweekcalls) && lastweekcalls.length > 0) {
            const totalDurations = lastweekcalls.reduce((acc, item) => {
                const duration = parseInt(item.duration, 10);
                if (!isNaN(duration) && duration > 0) {
                    acc.sum += duration;
                }
                return acc;
            }, { sum: 0 });

            // Convert total durations into minutes and seconds
            const minutes = Math.floor(totalDurations.sum / 60);
            const seconds = totalDurations.sum % 60;
            setTotalLastWeekDuration({ minutes, seconds });
        } else {
            //("No data available in Last week call");
        }
    }, [lastweekcalls]);


    useEffect(() => {
        getUserInfo();
    }, []);

    useEffect(() => {
        CallHistory_API()
    }, [userdetail])

    const getUserInfo = async () => {
        try {
            const data = await AsyncStorage.getItem('userData');
            if (data) {
                const parsedData = JSON.parse(data);
                // //('User Info:', parsedData);
                setUserDetails(parsedData);
            } else {
                //('No user data found');
            }
        } catch (error) {
            //('Error fetching user data:', error);
        }
    };

    const onSlideRight = () => {
        logout()
    };

    const showConfirmDialog = () => {
        return Alert.alert(
            "Are you sure?",
            "Are you sure you want to LOGOUT?",
            [
                {
                    text: "Yes",
                    onPress: () => {
                        onSlideRight();
                        setShowBox(false);
                    },
                },
                {
                    text: "No",
                },
            ]
        );
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
            setYesterdayCalls(yesterdayCalls)
            setLastWeekCalls(lastWeekCalls)

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


    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <DrawerContentScrollView {...props}>
                <View>
                    <FastImage
                        source={require('../assets/logo.gif')}
                        style={{ width: 200, height: 200, left: 20 }}
                        resizeMode={FastImage.resizeMode.contain}
                    />
                    <Text style={{ fontSize: 18, color: 'grey', marginLeft: 16 }}>Acadecraft</Text>
                    <Text style={{ fontSize: 18, color: 'black', marginLeft: 16, fontWeight: 'bold' }}>
                        {userdetail?.name || 'Loading...'}
                    </Text>

                    {/* Main scrollable content */}
                    <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
                        <Text style={{ color: 'black', fontSize: 16, marginTop: 15, marginLeft: 16, fontWeight: '600' }}>Today</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginRight: 16 }}>
                            <View style={styles.card}>
                                <Text style={styles.cardNumber}>{currentdatefromdatabase?.length}</Text>
                                <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
                                    <Image source={images.call} style={styles.icon} />
                                    <Text style={styles.cardText}>Number of Calls</Text>
                                </View>
                                <View style={styles.separator} />
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoText}>Unique Calls</Text>
                                    <Text style={styles.infoText}>{uniqueCallsCount}</Text>
                                </View>
                                <View style={styles.separator1} />
                                <View style={[styles.infoRow, { marginTop: 10 }]}>
                                    <Text style={styles.infoText}>Connected Calls</Text>
                                    <Text style={styles.infoText}> {connectedCallsCount}</Text>
                                </View>
                            </View>
                            <View style={styles.durationBox}>
                                <Text style={styles.durationText}>{totalDuration.minutes}m {totalDuration.seconds}s</Text>
                                <View style={{ flexDirection: 'row' }}>
                                    <Image source={images.clock} style={styles.clockIcon} />
                                    <Text style={styles.durationLabel}>Durations</Text>
                                </View>
                            </View>
                        </View>

                        {/* Yesterday section */}
                        <View style={styles.historyCard}>
                            <View style={styles.historyContent}>
                                <View style={styles.historyColumn}>
                                    <Text style={styles.historyTitle}>Yesterday</Text>
                                    <Text style={styles.historyLabel}>Number of Calls</Text>
                                    <Text style={[styles.historyLabel, { marginTop: 20 }]}>Durations</Text>
                                </View>
                                <View style={styles.historyColumnRight}>
                                    <Text style={styles.historyCount}>{yesterdaycalls?.length}</Text>
                                    <Text style={[styles.historyCount, { marginTop: 20 }]}>{totalYesterdayDuration.minutes}m {totalYesterdayDuration.seconds}s</Text>
                                </View>
                            </View>
                        </View>

                        {/* Last Week section */}
                        <View style={styles.historyCard}>
                            <View style={styles.historyContent}>
                                <View style={styles.historyColumn}>
                                    <Text style={styles.historyTitle}>Last Week</Text>
                                    <Text style={styles.historyLabel}>Number of Calls</Text>
                                    <Text style={[styles.historyLabel, { marginTop: 20 }]}>Durations</Text>
                                </View>
                                <View style={styles.historyColumnRight}>
                                    <Text style={styles.historyCount}>{lastweekcalls?.length}</Text>
                                    <Text style={[styles.historyCount, { marginTop: 20 }]}>{totalLastWeekDuration.minutes}m {totalLastWeekDuration.seconds}s</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </DrawerContentScrollView>

            {/* Sticky Bottom Section */}
            <View style={styles.bottomContainer}>
                <SwipeButton
                    height={43}
                    width={165}
                    railBackgroundColor="white"
                    railStyles={{
                        borderColor: 'blue',
                        backgroundColor: 'blue',
                    }}
                    thumbIconBackgroundColor={'blue'}
                    title="      LOGOUT"
                    titleStyles={{ fontSize: 14, fontWeight: 'bold' }}
                    onSwipeSuccess={showConfirmDialog}
                    thumbIconWidth={50}
                    thumbIconBorderColor="white"
                    railFillBorderColor="grey"
                    thumbIconStyles={{ borderRadius: 35 }}
                    thumbIconComponent={() => (
                        <Image
                            source={arrowright}
                            style={{ height: 30, width: 30, tintColor: 'white' }}
                        />
                    )}
                />
                <View style={styles.poweredByContainer}>
                    <Image source={images.copyright} style={styles.poweredByIcon} />
                    <Text style={styles.poweredByText}>Powered by Acadecraft Pvt Ltd.</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: 20,
        backgroundColor: 'white',
    },
    poweredByContainer: {
        flexDirection: 'row',
        marginTop: 10,
        alignItems: 'center',
    },
    poweredByIcon: {
        height: 15,
        width: 15,
    },
    poweredByText: {
        color: 'black',
        fontSize: 12,
        left: 5,
    },
    card: {
        borderWidth: 1,
        height: 120,
        width: 150,
        borderRadius: 8,
        marginLeft: 16,
        borderColor: 'blue',
        backgroundColor: 'blue',
    },
    cardNumber: {
        textAlign: "center",
        fontWeight: "bold",
        color: "white",
        fontSize: 18,
        top: 3,
    },
    icon: {
        height: 10,
        width: 10,
        tintColor: 'white',
        right: 7,
        top: 3,
    },
    cardText: {
        color: "white",
        fontSize: 12,
    },
    separator: {
        borderWidth: 0.5,
        borderColor: 'white',
        top: 5,
    },
    separator1: {
        borderWidth: 0.5,
        borderColor: 'white',
        top: 14,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: 16,
        marginRight: 16,
        top: 10,
    },
    infoText: {
        color: 'white',
        fontSize: 14,
    },
    durationBox: {
        marginTop: 40,
        right: 5,
    },
    durationText: {
        alignSelf: 'center',
        color: 'blue',
    },
    clockIcon: {
        height: 15,
        width: 15,
        right: 10,
    },
    durationLabel: {
        color: 'black',
        fontSize: 12,
    },
    historyCard: {
        borderWidth: 1,
        height: 120,
        width: '90%',
        alignSelf: "center",
        marginTop: 20,
        borderRadius: 8,
        backgroundColor: 'rgba(234,240,248,255)',
        borderColor: 'rgba(234,240,248,255)',
    },
    historyContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    historyColumn: {
        marginLeft: 16,
    },
    historyTitle: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 16,
    },
    historyLabel: {
        color: 'black',
        fontSize: 12,
        top: 10,
    },
    historyColumnRight: {
        marginRight: 16,
    },
    historyCount: {
        color: 'blue',
        fontWeight: 'bold',
        fontSize: 18,
        top: 20,
    },
});

export default DrawerContent;