import { View, StyleSheet, ImageBackground, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CelestialBackgroundProps {
    children?: React.ReactNode;
    backgroundImage?: ImageSourcePropType;
}

export function CelestialBackground({ children, backgroundImage }: CelestialBackgroundProps) {
    return (
        <View style={styles.container}>
            <ImageBackground
                source={backgroundImage ?? require('../../assets/screens/home_vibrant.jpg')}
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
