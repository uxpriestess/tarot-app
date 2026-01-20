import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity, Image } from 'react-native';

interface MysticCardProps {
    title: string;
    subtitle: string;
    icon: any; // Support require() local images
    isActive: boolean;
    scale?: Animated.AnimatedInterpolation<number> | Animated.Value;
    opacity?: Animated.AnimatedInterpolation<number> | Animated.Value;
    onPress?: () => void;
}

export function MysticCard({ title, subtitle, icon, isActive, scale, opacity, onPress }: MysticCardProps) {
    return (
        <Animated.View
            style={[
                styles.card,
                isActive && styles.activeCard,
                scale && { transform: [{ scale }] },
                opacity && { opacity }
            ]}
        >
            <TouchableOpacity
                activeOpacity={isActive ? 0.7 : 1}
                onPress={isActive ? onPress : undefined}
                style={styles.content}
            >
                <Image
                    source={icon}
                    style={[styles.icon, isActive && styles.activeIcon]}
                    resizeMode="contain"
                />
                <View style={[styles.divider, isActive && styles.activeDivider]} />
                <Text style={[styles.title, isActive && styles.activeTitle]}>{title}</Text>
                {subtitle ? (
                    <Text style={[styles.subtitle, isActive && styles.activeSubtitle]}>{subtitle}</Text>
                ) : null}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: 250,
        height: 400,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    activeCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderColor: 'rgba(255, 255, 255, 0.6)',
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 25,
        elevation: 12,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    icon: {
        width: 100,
        height: 100,
        marginBottom: 15,
        opacity: 0.8,
    },
    activeIcon: {
        width: 140,
        height: 140,
        marginBottom: 20,
        opacity: 1,
    },
    divider: {
        width: 30,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 15,
    },
    activeDivider: {
        width: 60,
        backgroundColor: '#ffffff',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        color: '#f5f0f6',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        marginBottom: 8,
    },
    activeTitle: {
        fontSize: 22,
        color: '#ffffff',
        fontWeight: '500',
    },
    subtitle: {
        fontSize: 12,
        color: '#c9b8d4',
        textAlign: 'center',
        opacity: 0,
    },
    activeSubtitle: {
        fontSize: 13,
        opacity: 1,
    },
});
