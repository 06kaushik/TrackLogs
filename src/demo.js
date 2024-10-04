import React, { useEffect, useReducer, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './src/navigation/AuthStack';
import HomeStack from './src/navigation/HomeStack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FETCH_URL } from './src/component/FetchApi';
import { ContextApi } from './src/component/ContextApi';
import { StatusBar, ToastAndroid } from 'react-native';
import { COLORS } from './src/component/GlobalStyle';
import Color from './src/Theme/Color';
import { requestUserPermission } from './src/screens/DashBoardScreen/PushNoti_Helper';


const App = () => {

    const [userDetail, setDetail] = useState('')


    // useEffect(() => {
    //   requestUserPermission()

    // }, [])

    axios.defaults.baseURL = FETCH_URL;
    let initialState = {
        userToken: null
    }

    const authReducer = (prevState, action) => {
        switch (action.type) {
            case 'LOGIN':
                return {
                    ...prevState,
                    userToken: action.userToken

                };
            case 'LOGOUT':
                return {
                    ...prevState,
                    userToken: null

                };
            case 'RETRIEVE_TOKEN':
                return {
                    ...prevState,
                    userToken: action.userToken

                };

        }

    }

    const [authState, dispatch] = useReducer(authReducer, initialState);

    const authData = useMemo(() => ({
        login: async (userToken, user) => {

            try {
                await AsyncStorage.setItem('TOKEN', JSON.stringify(userToken))
                await AsyncStorage.setItem('USER', JSON.stringify(user))

                dispatch({ type: 'LOGIN', userToken })
                axios.defaults.headers.common = { Authorization: `Bearer ${userToken}` };
            } catch (error) {
                ToastAndroid.show(error, ToastAndroid.LONG, ToastAndroid.BOTTOM);
            }
        },
        logout: async (userToken, user) => {
            try {
                await AsyncStorage.removeItem('TOKEN')
                await AsyncStorage.removeItem('USER')
                await AsyncStorage.removeItem('fcmtoken')

                dispatch({ type: 'LOGOUT' })

            } catch (error) {
                ToastAndroid.show(error, ToastAndroid.LONG, ToastAndroid.BOTTOM);

            }
        }
    }))

    const getUser = async () => {
        try {
            let userDetail = await AsyncStorage.getItem('USER');
            let data = JSON.parse(userDetail);
            // console.log(data);
            setDetail(data)
        } catch (error) {
            ToastAndroid.show(error, ToastAndroid.LONG, ToastAndroid.BOTTOM);
        }
    }

    useEffect(() => {
        getUser();
    }, [])

    useEffect(() => {
        const retriveToken = async () => {
            let userToken = await AsyncStorage.getItem('TOKEN')
            console.log('jwt tokenn', userToken);
            dispatch({ type: 'RETRIEVE_TOKEN', userToken: userToken ? JSON.parse(userToken) : null })
            axios.defaults.headers.common = { Authorization: `Bearer ${JSON.parse(userToken)}` };
        }
        retriveToken()

    }, [])
    return (

        <>

            <ContextApi.Provider value={authData}>
                <StatusBar backgroundColor={Color.background} />
                <NavigationContainer>
                    {authState.userToken === null ?
                        <AuthStack />
                        :
                        <HomeStack />
                    }


                </NavigationContainer>

            </ContextApi.Provider>

        </>

    )
}


export default App