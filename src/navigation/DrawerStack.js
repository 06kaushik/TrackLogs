import React from "react";
import { createDrawerNavigator } from '@react-navigation/drawer';
import BottomTabNavigator from "./BottomStack";
import DrawerContent from "./DrawerContent";


const Drawer = createDrawerNavigator();


const DrawerNavigation = () => {

    return (

        <Drawer.Navigator screenOptions={{ headerShown: false, }} drawerContent={props => <DrawerContent {...props} />} >
            <Drawer.Screen name="Home1" component={BottomTabNavigator} />
        </Drawer.Navigator>

    )
}

export default DrawerNavigation;