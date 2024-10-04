import React, { useContext, useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';



const DrawerContent = ({ props, navigation }) => {


    return (
        <View>
            <DrawerContentScrollView {...props} style={{}}>
            </DrawerContentScrollView>
        </View>
    )
}



export default DrawerContent;

