import { View, StyleSheet, ImageBackground, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function CelestialBackground({ children }: { children?: React.ReactNode }) {
    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../../assets/screens/home_vibrant.jpg')}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            >
                {/* Deeper gradient for the darker vibrant theme */}
                <LinearGradient
                    colors={['rgba(15, 10, 25, 0.4)', 'rgba(30, 20, 50, 0.7)']}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.content}>{children}</View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1228',
    },
    content: {
        flex: 1,
    },
});
