import React, { useEffect } from 'react';
import CallKeep from 'react-native-callkeep';
import { PermissionsAndroid } from 'react-native';

// Define your CallKeep options
const callKeepOptions = {
    ios: {
        appName: 'MyApp',
    },
    android: {
        alertTitle: 'Permissions required',
        alertDescription: 'This app needs to access your phone call state',
        cancelButton: 'Cancel',
        okButton: 'ok',
    },
};

const CallHandler = () => {
    useEffect(() => {
        requestPermissions()
        setupCallKeep();

        // Cleanup listeners on unmount
        return () => {
            CallKeep.removeEventListener('didReceiveStartCallAction', onStartCall);
            CallKeep.removeEventListener('didReceiveIncomingCall', onIncomingCall);
        };
    }, []);

    const requestPermissions = async () => {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
                {
                    title: 'Phone State Permission',
                    message: 'This app needs access to your phone call state',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('Phone state permission granted');
            } else {
                console.log('Phone state permission denied');
            }
        } catch (err) {
            console.warn(err);
        }
    };

    const setupCallKeep = () => {
        CallKeep.setup(callKeepOptions)
            .then((accepted) => {
                console.log('CallKeep setup accepted:', accepted);
                if (accepted) {
                    CallKeep.setAvailable(true); // Make your app ready to handle calls
                    listenToIncomingAndOutgoingCalls();
                }
            })
            .catch((error) => {
                console.error('CallKeep setup error:', error);
            });
    };


    const listenToIncomingAndOutgoingCalls = () => {
        // Listener for incoming call
        CallKeep.addEventListener('didReceiveIncomingCall', onIncomingCall);
        // Listener for outgoing call (start call action)
        CallKeep.addEventListener('didReceiveStartCallAction', onStartCall);
    };

    // Handle outgoing call
    const onStartCall = (data) => {
        console.log('Outgoing call started:', data);
        const { handle } = data; // The phone number being dialed
        // Your logic for handling outgoing call
    };

    // Handle incoming call
    const onIncomingCall = (data) => {
        console.log('Incoming call:', data);
        const { handle, callUUID } = data; // handle is the caller's number
        // Your logic for handling incoming call
    };

    return null;
};

export default CallHandler;
