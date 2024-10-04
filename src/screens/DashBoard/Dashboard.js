import React from "react";
import { Text, View, StyleSheet } from 'react-native'


const DashBoard = () => {

    return (

        <View style={style.main}>
            <Text style={{ color: 'black' }}>DashBoard</Text>
        </View>
    )
}


export default DashBoard;

const style = StyleSheet.create({
    main: {
        flex: 1,
        backgroundColor: 'white'
    }
})