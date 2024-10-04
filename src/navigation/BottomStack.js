import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View } from 'react-native';
import images from '../component/images';
import CallScreen from '../screens/CallScreen/CallScreen';
import HistoryScreen from '../screens/HistoryScreen.js/HistoryScreen';
import ContactsScreen from '../screens/Contacts/Contacts';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarIcon: ({ focused }) => {
                    let iconSource;

                    if (route.name === 'Calls') {
                        iconSource = images.call;
                    } else if (route.name === 'History') {
                        iconSource = images.history;
                    } else if (route.name === 'Contacts') {
                        iconSource = images.contacts;
                    }

                    return (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Image
                                source={iconSource}
                                style={{
                                    width: 30,
                                    height: 30,
                                    tintColor: focused ? 'blue' : 'gray',
                                }}
                            />
                        </View>
                    );
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    paddingBottom: 5,
                },
                tabBarActiveTintColor: 'blue',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    backgroundColor: '#fff',
                    height: 70
                },
            })}
        >
            <Tab.Screen name="Calls" component={CallScreen} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Contacts" component={ContactsScreen} />
        </Tab.Navigator>
    );
};

export default BottomTabNavigator;
