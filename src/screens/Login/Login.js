import React, { useState, useContext } from "react";
import { Text, View, StyleSheet, ToastAndroid, Image } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { ContextApi } from "../../component/ContextApi";
import AsyncStorage from '@react-native-async-storage/async-storage';
import images from "../../component/images";

const Login = () => {

    // const [loginId, setLoginId] = useState('bikram@acadecraft.com');
    // const [password, setPassword] = useState('11223344');
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useContext(ContextApi);


    const LoginEmail = async () => {
        try {
            const formData = new FormData();
            formData.append('username', loginId);
            formData.append('password', password);

            const options = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                method: 'POST',
                body: formData,
            };
            console.log('')
            const response = await fetch('https://tracklog.live/api/v1/login', options);
            const result = await response.json();

            if (response.ok && result.status === "Success") {
                const user = result.data;
                login(null, user);
                ToastAndroid.show('Successfully Login', ToastAndroid.SHORT);
                const userData = { ...user, password };
                await AsyncStorage.setItem('userData', JSON.stringify(userData));
            } else {
                ToastAndroid.show('Login Failed, Check your Credentials', ToastAndroid.SHORT);
            }
            return result;
        } catch (error) {
            ToastAndroid.show('Login Failed, Check your Credentials', ToastAndroid.SHORT);

            return null;
        }
    };


    return (
        <View style={styles.main}>
            {/* <Image  source={images.tracklogo} style={{height:300,width:300,alignSelf:'center',marginBottom:20}}/> */}
            <Text style={styles.title}>Login</Text>

            <TextInput
                label="Login ID"
                value={loginId}
                onChangeText={text => setLoginId(text)}
                mode="flat"
                style={styles.input}
            />

            <TextInput
                label="Password"
                value={password}
                onChangeText={text => setPassword(text)}
                mode="flat"
                secureTextEntry={!showPassword}  // toggle visibility
                right={
                    <TextInput.Icon
                        name={showPassword ? "eye-off" : "eye"}
                        onPress={() => setShowPassword(!showPassword)}  // toggle password visibility
                    />
                }
                style={styles.input}
            />

            <Button
                mode="contained"
                onPress={LoginEmail}
                style={styles.button}
            >
                Login
            </Button>
        </View>
    );
};

export default Login;

const styles = StyleSheet.create({
    main: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: 'black',
    },
    input: {
        marginBottom: 20,
        backgroundColor: 'transparent',
        color: 'black',
    },
    button: {
        marginTop: 40,
        backgroundColor: 'blue'
    },
});
