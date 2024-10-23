import React, { useState } from "react";
import { Text, View, StyleSheet, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import images from "./images";
import ImmediatePhoneCall from 'react-native-immediate-phone-call';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CallLogs from 'react-native-call-log'; // Import the call log library
import moment from "moment";
import Realm from 'realm';
import { RealmProvider } from '@realm/react';

const { width, height } = Dimensions.get('window');


const CallDataSchema = {
    name: 'CallData',
    properties: {
        _id: 'int',
        phoneNumber: 'string',
        dateTime: 'string',
    },
    primaryKey: '_id',
};


const DialScreen = ({ navigation }) => {
    const [typedNumber, setTypedNumber] = useState('');
    const [calldataoutgoing, setCallDataOutgoing] = useState([]);

    const dialPadNumbers = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['*', '0', '#']
    ];

    const handleNumberPress = (number) => {
        setTypedNumber(typedNumber + number);
    };

    const handleDeletePress = () => {
        if (typedNumber.length > 0) {
            setTypedNumber(typedNumber.slice(0, -1));
        }
    };

    // Function to save the phone number and timestamp in AsyncStorage
    const savePhoneNumberToStorage = async (number) => {
        const dateTime = moment().format('DD-MMM-YYYY HH:mm:ss')
        const realm = await Realm.open({ schema: [CallDataSchema] });

        try {
            // Generate a new ID for the call
            const lastCall = realm.objects('CallData').sorted('_id', true)[0];
            const newId = lastCall ? lastCall._id + 1 : 1;

            // Save the call in Realm
            realm.write(() => {
                realm.create('CallData', {
                    _id: newId,
                    phoneNumber: number,
                    dateTime: dateTime,
                });
            });

            // Get existing data from AsyncStorage
            const existingData = await AsyncStorage.getItem('realmDataoutgoing');
            const existingCallData = existingData ? JSON.parse(existingData) : [];

            // Check if the new call already exists based on _id
            const isExisting = existingCallData.some(call => call._id === newId);

            if (!isExisting) {
                // Only save if the _id is not already in the stored data
                await AsyncStorage.setItem('realmDataoutgoing', JSON.stringify([...existingCallData, { _id: newId, phoneNumber: number, dateTime: dateTime }]));
            } else {
                console.log('Call already exists in AsyncStorage with _id:', newId);
            }

            // ('Data saved in Realm:', callData);
        } catch (error) {
            console.error('Failed to save call data in Realm:', error);
        } finally {
            realm.close();
        }
    };

    const handleCallPress = async () => {
        if (typedNumber.length === 0) {
            Alert.alert('Error', 'Please enter a number to dial.');
        } else {
            try {
                ImmediatePhoneCall.immediatePhoneCall(typedNumber);
                await savePhoneNumberToStorage(typedNumber); // Save the dialed number and timestamp
            } catch (error) {
                Alert.alert('Error', 'An error occurred while trying to make the call.');
                console.error(error);
            }
        }
    };

    return (
        <View style={styles.main}>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack('')} >
                    <Image source={images.back} style={styles.back} />
                </TouchableOpacity>
                <Text style={styles.txt}>Dial</Text>
            </View>

            <View style={styles.displayContainer}>
                <Text style={styles.displayText}>{typedNumber}</Text>
                {typedNumber.length > 0 && (
                    <TouchableOpacity onPress={handleDeletePress}>
                        <Text style={styles.deleteText}>⌫</Text>
                    </TouchableOpacity>
                )}
            </View>

            {typedNumber.length > 0 && (
                <View style={styles.separator} />
            )}

            <View style={styles.dialPad}>
                {dialPadNumbers.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.dialPadRow}>
                        {row.map((number) => (
                            <TouchableOpacity
                                key={number}
                                style={styles.dialPadButton}
                                onPress={() => handleNumberPress(number)}
                            >
                                <Text style={styles.dialPadText}>{number}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.callButton} onPress={handleCallPress}>
                <Image source={images.call} style={styles.callIcon} />
            </TouchableOpacity>
        </View>
    );
};

const DialcreenWrapper = ({ navigation }) => {
    return (
        <RealmProvider schema={[CallDataSchema]}>
            <DialScreen navigation={navigation} />
        </RealmProvider>
    );
};

export default DialcreenWrapper;

const styles = StyleSheet.create({
    main: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: height * 0.03, // Dynamically adjust based on screen height
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: width * 0.05, // Dynamic padding based on screen width
    },
    back: {
        height: 25,
        width: 25,
    },
    txt: {
        color: 'black',
        marginLeft: 15,
        fontSize: 18,
        fontWeight: 'bold',
    },
    displayContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '80%',
        paddingHorizontal: 10,
        paddingVertical: 20,
    },
    displayText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: 'black',
        letterSpacing: 2,
    },
    deleteText: {
        fontSize: 25,
        color: 'black',
        paddingHorizontal: 10,
    },
    separator: {
        borderWidth: 0.5,
        width: '90%',
        borderColor: '#DDDDDD',
        marginTop: 20,
    },
    dialPad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: height * 0.02,
    },
    dialPadRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginVertical: height * 0.01, // Adjust row margin based on height
    },
    dialPadButton: {
        width: width * 0.18, // Adjust button size based on screen width
        height: width * 0.18,
        borderRadius: (width * 0.18) / 2,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 10,
    },
    dialPadText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'black',
    },
    callButton: {
        width: width * 0.18,
        height: width * 0.18,
        borderRadius: (width * 0.18) / 2,
        backgroundColor: 'green',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: height * 0.02,
    },
    callIcon: {
        width: width * 0.1,
        height: width * 0.1,
        tintColor: 'white',
    },
});
