import React, { useEffect, useReducer, useMemo, useState } from 'react';
import { StatusBar, ToastAndroid, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import AuthStack from './src/navigation/AuthStack';
import HomeStack from './src/navigation/HomeStack';
import { ContextApi } from './src/component/ContextApi';
import { FETCH_URL } from "./src/component/FetchApi";
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';




const App = () => {

  const [userDetail, setDetail] = useState(null);
  axios.defaults.baseURL = FETCH_URL;




  let initialState = {
    userToken: null,
    isLoading: true,
  };


  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      // Check and request Call Log permission
      const callLogStatus = await request(PERMISSIONS.ANDROID.READ_CALL_LOG);
      if (callLogStatus !== RESULTS.GRANTED) {
        // Alert.alert('Permission Required', 'Call log permission is required for app functionality.');
      }

      // Check and request Contacts permission
      const contactsStatus = await request(PERMISSIONS.ANDROID.READ_CONTACTS);
      if (contactsStatus !== RESULTS.GRANTED) {
        // Alert.alert('Permission Required', 'Contacts permission is required for app functionality.');
      }

      // Check and request Phone permission
      const phoneStatus = await request(PERMISSIONS.ANDROID.READ_PHONE_STATE);
      if (phoneStatus !== RESULTS.GRANTED) {
        // Alert.alert('Permission Required', 'Phone permission is required for app functionality.');
      }

    } catch (error) {
      console.error('Permission request error: ', error);
    }
  };

  const authReducer = (prevState, action) => {
    switch (action.type) {
      case 'LOGIN':
        return {
          ...prevState,
          userToken: action.userToken,
          isLoading: false,
        };
      case 'LOGOUT':
        return {
          ...prevState,
          userToken: null,
          isLoading: false,
        };
      case 'RETRIEVE_TOKEN':
        return {
          ...prevState,
          userToken: action.userToken,
          isLoading: false,
        };
      default:
        return prevState;
    }
  };

  const [authState, dispatch] = useReducer(authReducer, initialState);

  const authData = useMemo(() => ({
    login: async (userToken, user) => {
      try {
        const tokenString = typeof userToken === 'string' ? userToken : JSON.stringify(userToken);
        await AsyncStorage.setItem('TOKEN', tokenString);
        await AsyncStorage.setItem('USER', JSON.stringify(user));

        dispatch({ type: 'LOGIN', userToken: tokenString });
        axios.defaults.headers.common = { Authorization: `Bearer ${tokenString}` };
      } catch (error) {
        console.error('Error storing login data:', error);
        ToastAndroid.show('Failed to log in', ToastAndroid.LONG, ToastAndroid.BOTTOM);
      }
    },
    logout: async () => {
      try {
        await AsyncStorage.removeItem('TOKEN');
        await AsyncStorage.removeItem('USER');
        await AsyncStorage.removeItem('fcmtoken');

        dispatch({ type: 'LOGOUT' });
        delete axios.defaults.headers.common['Authorization'];
      } catch (error) {
        console.error('Error during logout:', error);
        ToastAndroid.show('Failed to log out', ToastAndroid.LONG, ToastAndroid.BOTTOM);
      }
    },
  }), []);

  const getUser = async () => {
    try {
      const userDetail = await AsyncStorage.getItem('USER');
      if (userDetail) {
        const parsedUser = JSON.parse(userDetail);
        setDetail(parsedUser);
      }
    } catch (error) {
      console.error('Error getting user details:', error);
      ToastAndroid.show('Failed to retrieve user details', ToastAndroid.LONG, ToastAndroid.BOTTOM);
    }
  };

  useEffect(() => {
    getUser();
  }, []);


  useEffect(() => {
    const retrieveToken = async () => {
      try {
        const userToken = await AsyncStorage.getItem('TOKEN');
        if (userToken) {
          dispatch({ type: 'RETRIEVE_TOKEN', userToken });
          axios.defaults.headers.common = { Authorization: `Bearer ${userToken}` };
        } else {
          dispatch({ type: 'RETRIEVE_TOKEN', userToken: null });
        }
      } catch (error) {
        console.error('Error retrieving token:', error);
        ToastAndroid.show('Failed to retrieve token', ToastAndroid.LONG, ToastAndroid.BOTTOM);
      }
    };
    retrieveToken();
  }, []);

  if (authState.isLoading) {
    return null;
  }

  return (
    <ContextApi.Provider value={authData}>
      <NavigationContainer>
        {authState.userToken === null ? <AuthStack /> : <HomeStack />}
      </NavigationContainer>
    </ContextApi.Provider>
  );
};

export default App;
