import React, { useState, useEffect } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import DashBoard from "../screens/DashBoard/Dashboard";
import BottomTabNavigator from "./BottomStack";
import DrawerNavigation from "./DrawerStack";
import DialScreen from "../component/DialScreen";


const Stack = createStackNavigator();

const HomeStack = () => {
    const navigation = useNavigation()

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>

            <Stack.Screen name="Home" component={DrawerNavigation} />
            <Stack.Screen name="DialScreen" component={DialScreen} />



        </Stack.Navigator>
    )

}

export default HomeStack;