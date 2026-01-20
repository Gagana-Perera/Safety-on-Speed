import { Text, ImageBackground, Image } from 'react-native'
import { Tabs } from 'expo-router'
import { images } from '@/constants/images'
import { icons } from '@/constants/icons'

const TabIcon = ({ focused, icon, title }: any ) => {
    if (focused) {
        return (
        )
    }
}

const _layout = () => {
  return (
    <Tabs
    screenOptions={{
        tabBarShowLabel: false,
        tabBarIconStyle: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center'
        },
        tabBarStyle: {
            backgroundColor: '#0F0D23',
            borderRadius: 50,
            marginHorizontal: 20,
            marginBottom: 36,
            height: 52,
            position: 'absolute',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#0F0D23'
        }
    }}
    >
        <Tabs.Screen
        name="index"
        options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
                <TabIcon 
                focused= {focused}
                icon={icons.home}
                title="Home"
                />
            )
        }}
        />
        <Tabs.Screen
        name="search"
        options={{
            title: "Search",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
                <TabIcon 
                focused= {focused}
                icon={icons.search}
                title="Search"
                />
            )
        }}
        />
        <Tabs.Screen
        name="saved"
        options={{
            title: "Saved",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
                <TabIcon 
                focused= {focused}
                icon={icons.save}
                title="Saved"
                />
            )
        }}
        />
        <Tabs.Screen
        name="profile"
        options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
                <TabIcon 
                focused= {focused}
                icon={icons.person}
                title="Profile"
                />
            )
        }}
        />
    </Tabs>
  )
}

export default _layout