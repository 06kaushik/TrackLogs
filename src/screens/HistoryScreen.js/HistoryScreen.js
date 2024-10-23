import React, { useState, useEffect } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Image, Dimensions, FlatList } from 'react-native';
import images from "../../component/images";
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import AsyncStorage from "@react-native-async-storage/async-storage";

const WINDOW_HEIGHT = Dimensions.get('window').height;
const WINDOW_WIDTH = Dimensions.get('window').width;
const callHistory = 'https://tracklog.live/api/v1/calls/history';

const HistoryScreen = ({ navigation }) => {

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedDate1, setSelectedDate1] = useState(new Date());
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [isDatePickerOpen1, setDatePickerOpen1] = useState(false);
    const [userdetail, setUserDetails] = useState({});

    const showDatePicker = () => {
        setDatePickerOpen(true);
    };

    const hideDatePicker = () => {
        setDatePickerOpen(false);
    };

    const handleDateConfirm = (date) => {
        setSelectedDate(date);  // Update the selected date
        hideDatePicker();
    };

    const showDatePicker1 = () => {
        setDatePickerOpen1(true);
    };

    const hideDatePicker1 = () => {
        setDatePickerOpen1(false);
    };

    const handleDateConfirm1 = (date) => {
        setSelectedDate1(date);  // Update the selected date1
        hideDatePicker1();
    };

    const formtDate = moment(selectedDate).format('DD-MM-YYYY');
    const formtDate1 = moment(selectedDate1).format('DD-MM-YYYY');
    console.log('from and to', formtDate, formtDate1);

    useEffect(() => {
        getUserInfo();
    }, []);

    useEffect(() => {
        if (userdetail && userdetail.id) {
            CallHistory_API();  // Trigger API call when user details or dates change
        }
    }, [userdetail, formtDate, formtDate1]);  // Re-run API call when selected dates change

    const getUserInfo = async () => {
        try {
            const data = await AsyncStorage.getItem('userData');
            if (data) {
                const parsedData = JSON.parse(data);
                setUserDetails(parsedData);
            } else {
                console.log('No user data found');
            }
        } catch (error) {
            console.log('Error fetching user data:', error);
        }
    };

    const CallHistory_API = async () => {
        try {
            let options = {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                method: 'POST'
            };
            options.body = new FormData();
            options.body.append("user_id", userdetail.id);
            options.body.append("password", userdetail.password);
            options.body.append("startDate", formtDate);
            options.body.append("endDate", formtDate1);
            options.body.append("company_id", userdetail.company_id);

            // console.log('Request Options:', options);
            options.body._parts.map((item) => {
                // console.log('FormData Part:', item);
            });

            let response = await fetch(callHistory, options);
            let data = await response.json();
            // console.log('Call history data:', data?.data);

            return data;

        } catch (error) {
            console.error(error);
            return [];
        }
    };

    return (
        <View style={styles.main}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack('')}>
                    <Image source={images.back} style={styles.back} />
                </TouchableOpacity>
                <Text style={styles.txt}>Call History</Text>
            </View>

            <View style={styles.view}>
                <Text style={{ color: 'black', fontSize: 16, top: 8 }}>From:</Text>
                <TouchableOpacity style={styles.assignDate} onPress={showDatePicker}>
                    <Text style={styles.assignDateText}>{formtDate !== 'Invalid date' ? formtDate : 'dd-mm-yy'}</Text>
                    <Image source={images.calendar} style={{ height: 15, width: 15 }} />
                </TouchableOpacity>

                <Text style={{ color: 'black', fontSize: 16, top: 8, left: 20 }}>To:</Text>
                <TouchableOpacity style={styles.assignTime} onPress={showDatePicker1}>
                    <Text style={styles.assignDateText}>{formtDate1 !== 'Invalid date' ? formtDate1 : 'dd:mm-yy'}</Text>
                    <Image source={images.calendar} style={{ height: 15, width: 15 }} />
                </TouchableOpacity>
            </View>

            <DatePicker
                modal
                open={isDatePickerOpen}
                mode="date"
                date={selectedDate || new Date()}
                onConfirm={handleDateConfirm}
                onCancel={hideDatePicker}
                theme='light'
            />
            <DatePicker
                modal
                open={isDatePickerOpen1}
                mode="date"
                date={selectedDate1 || new Date()}
                onConfirm={handleDateConfirm1}
                onCancel={hideDatePicker1}
                theme='light'
            />

            <View>
                <FlatList />
            </View>
        </View>
    );
};

export default HistoryScreen;

const styles = StyleSheet.create({
    main: {
        flex: 1,
        padding: 16,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
        marginTop: 10,
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
    view: {
        width: WINDOW_WIDTH - 50,
        flexDirection: "row",
        height: 40,
        marginTop: 30,
        marginLeft: 16,
    },
    assignDate: {
        borderWidth: 1,
        backgroundColor: "white",
        flex: .4,
        marginLeft: 5,
        borderRadius: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderColor: '#DDDDDD',
        left: 5,
    },
    assignDateText: {
        fontSize: 14,
        color: "black",
        marginRight: 5,
    },
    assignTime: {
        backgroundColor: "white",
        flex: .4,
        marginLeft: 5,
        borderRadius: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderColor: '#DDDDDD',
        borderWidth: 1,
        left: 25,
    },
});
