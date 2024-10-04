import React, { useEffect, useState } from "react";
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    PermissionsAndroid,
    Alert,
    TextInput,
    Image,
    ActivityIndicator, // Import ActivityIndicator
} from 'react-native';
import Contacts from 'react-native-contacts';
import ImmediatePhoneCall from 'react-native-immediate-phone-call';
import images from "../../component/images";

const ContactsScreen = ({ navigation }) => {


    const [contacts, setContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true); // State for loading

    useEffect(() => {
        const requestContactsPermission = async () => {
            if (Platform.OS === 'android') {
                try {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
                        {
                            title: "Contacts Permission",
                            message: "This app needs access to your contacts.",
                            buttonNeutral: "Ask Me Later",
                            buttonNegative: "Cancel",
                            buttonPositive: "OK"
                        }
                    );

                    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                        console.log("You can use the contacts");
                        loadContacts(); // Load contacts after permission is granted
                    } else {
                        Alert.alert(
                            "Permission Denied",
                            "Please enable contacts permission in the app settings.",
                            [{ text: "OK" }]
                        );
                        setLoading(false); // Stop loading if permission denied
                    }
                } catch (err) {
                    console.warn(err);
                    setLoading(false); // Stop loading on error
                }
            } else {
                loadContacts(); // For iOS, permission is handled differently
            }
        };

        requestContactsPermission();
    }, []);

    const loadContacts = async () => {
        try {
            const fetchedContacts = await Contacts.getAll();

            // Sort contacts in ascending order by displayName
            const sortedContacts = fetchedContacts.sort((a, b) => {
                if (a.displayName < b.displayName) return -1;
                if (a.displayName > b.displayName) return 1;
                return 0;
            });

            setContacts(sortedContacts);
        } catch (error) {
            console.error("Failed to load contacts:", error);
        } finally {
            setLoading(false); // Stop loading after fetching contacts
        }
    };

    const handleCall = (phoneNumber) => {
        console.log("Calling:", phoneNumber);
        if (phoneNumber) {
            ImmediatePhoneCall.immediatePhoneCall(phoneNumber);
        } else {
            Alert.alert("No phone number", "This contact does not have a phone number.");
        }
    };

    const filteredContacts = contacts.filter(contact =>
        contact.displayName && contact.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderContactItem = ({ item }) => (
        <TouchableOpacity onPress={() => handleCall(item.phoneNumbers[0]?.number)}>
            <View style={styles.contactItem}>
                <Text style={styles.contactName}>{item.displayName}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack('')} >
                    <Image source={images.back} style={styles.back} />
                </TouchableOpacity>
                <Text style={styles.txt}>Contact Screen</Text>
            </View>



            <View style={styles.searchContainer}>
                <Image source={images.search} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Contacts"
                    placeholderTextColor={'grey'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View>
                <Text style={{ color: 'black', top: 30, fontSize: 16, fontWeight: '600' }}>All Contacts</Text>
            </View>


            {loading ? ( // Show loader if loading
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            ) : (
                <FlatList
                    data={filteredContacts}
                    renderItem={renderContactItem}
                    style={{ marginTop: 30 }}
                    keyExtractor={(item) => item.recordID}
                />
            )}
        </View>
    );
};

export default ContactsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: 'black',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 8,
        marginBottom: 16,
        height: 50,
        top: 30
    },
    searchIcon: {
        width: 20,
        height: 20,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: 'black',
        paddingTop: 4,
        top: 7,
        paddingLeft: 10
    },
    contactItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        top: 20
    },
    contactName: {
        fontSize: 18,
        color: 'black',
    },
    loaderContainer: { // Style for loader container
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
        marginTop: 10
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
});
