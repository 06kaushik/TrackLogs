import React, { useState } from "react";
import { Text, View, StyleSheet, Image, TouchableOpacity, Linking, Alert } from 'react-native';
import images from "./images";
import ImmediatePhoneCall from 'react-native-immediate-phone-call';
import Realm from "realm";
import Moment from "moment";

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

const DialScreen = ({ navigation }) => {

    const [typedNumber, setTypedNumber] = useState('');
    const [name, setName] = useState('');
    // const realm = Realm(); // Get the Realm instance


    const dialPadNumbers = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['*', '0', '#']
    ];

    // Function to handle number press
    const handleNumberPress = (number) => {
        setTypedNumber(typedNumber + number);
    };

    // Function to handle delete (backspace)
    const handleDeletePress = () => {
        if (typedNumber.length > 0) {
            setTypedNumber(typedNumber.slice(0, -1));
        }
    };

    const handleCallPress = () => {
        if (typedNumber.length === 0) {
            Alert.alert('Error', 'Please enter a number to dial.');
        } else {
            try {
                // Make the immediate phone call with the typed number
                SaveData(typedNumber, '')
                ImmediatePhoneCall.immediatePhoneCall(typedNumber);
            } catch (error) {
                Alert.alert('Error', 'An error occurred while trying to make the call.');
                console.error(error);
            }
        }
    };

    const SaveData = async (contact, name) => {
        try {
            const realm = await Realm.open({
                path: 'calling_detailsDatabase.realm',
                schema: [CallDetailsSchema],
            });

            const outgoing_id = Math.round(Date.now());
            console.log('Outgoing ID:', outgoing_id);

            realm.write(() => {
                const callRecord = {
                    id: outgoing_id,
                    phone: contact,
                    name: name,
                    call_date: Moment(new Date()).format('MMM D, YYYY HH:mm:ss'),
                    start_date: "",
                    end_date: "",
                    is_sync: "0",
                    type: "OUTGOING",
                };

                console.log('Call Data to be Saved:', callRecord);
                realm.create('incoming_call_detailsTable', callRecord);
            });

            console.log('Data saved successfully');
            Alert.alert('Success', 'Call data saved successfully');
        } catch (error) {
            console.error('Error saving data:', error);
            Alert.alert('Error', 'An error occurred while saving the call data');
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

            {/* Number Display and Delete Button */}
            <View style={styles.displayContainer}>
                <Text style={styles.displayText}>{typedNumber}</Text>
                {typedNumber.length > 0 && (
                    <TouchableOpacity onPress={handleDeletePress}>
                        {/* Wrap the delete (⌫) symbol inside a Text component */}
                        <Text style={styles.deleteText}>⌫</Text>
                    </TouchableOpacity>
                )}
            </View>
            {typedNumber.length > 0 ?
                <View style={{ borderWidth: 0.5, width: '90%', borderColor: '#DDDDDD', top: 40 }} />
                :
                null
            }
            {/* Dial Pad */}
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

            {/* Call Button */}
            <TouchableOpacity style={styles.callButton} onPress={() => handleCallPress()}>
                <Image source={images.call} style={styles.callIcon} />
            </TouchableOpacity>
        </View>
    );
};

export default DialScreen;

const styles = StyleSheet.create({
    main: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
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
        alignSelf: 'center',
        width: '80%',
        paddingHorizontal: 10,
        paddingVertical: 20,
        top: 120
        // borderBottomWidth: 1,
        // borderColor: '#ccc',
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
    dialPad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        top: 30
    },
    dialPadRow: {
        flexDirection: 'row',
    },
    dialPadButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
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
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'green',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    callIcon: {
        width: 40,
        height: 40,
        tintColor: 'white',
    }
});
