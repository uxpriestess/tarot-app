import React, { useRef } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { MysticCard } from './MysticCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = 280;
const ITEM_MARGIN = 0;

export interface CarouselItem {
    id: string;
    title: string;
    subtitle: string;
    greeting?: string;
    icon: string;
    action: string;
}

interface HomeCarouselProps {
    items: CarouselItem[];
    onIndexChange: (index: number) => void;
    currentIndex: number;
    onItemPress?: (id: string) => void;
}

export function HomeCarousel({ items, onIndexChange, currentIndex, onItemPress }: HomeCarouselProps) {
    const scrollX = useRef(new Animated.Value(0)).current;

    const onScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true }
    );

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            onIndexChange(viewableItems[0].index);
        }
    }).current;

    return (
        <View style={styles.container}>
            <Animated.FlatList
                data={items}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH}
                snapToAlignment="center"
                decelerationRate="fast"
                contentContainerStyle={{
                    paddingHorizontal: (SCREEN_WIDTH - ITEM_WIDTH) / 2,
                    alignItems: 'center',
                }}
                onScroll={onScroll}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{
                    itemVisiblePercentThreshold: 50,
                    minimumViewTime: 0
                }}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => {
                    const inputRange = [
                        (index - 1) * ITEM_WIDTH,
                        index * ITEM_WIDTH,
                        (index + 1) * ITEM_WIDTH,
                    ];

                    const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.85, 1, 0.85],
                        extrapolate: 'clamp',
                    });

                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.5, 1, 0.5],
                        extrapolate: 'clamp',
                    });

                    return (
                        <View style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
                            <MysticCard
                                title={item.title}
                                subtitle={item.subtitle}
                                icon={item.icon}
                                isActive={index === currentIndex}
                                scale={scale}
                                opacity={opacity}
                                onPress={() => onItemPress?.(item.id)}
                            />
                        </View>
                    );
                }}
            />

            {/* Dots Indicator */}
            <View style={styles.dotsContainer}>
                {items.map((_, i) => {
                    const scaleXAnim = scrollX.interpolate({
                        inputRange: [
                            (i - 1) * ITEM_WIDTH,
                            i * ITEM_WIDTH,
                            (i + 1) * ITEM_WIDTH,
                        ],
                        outputRange: [1, 3, 1],
                        extrapolate: 'clamp',
                    });

                    const opacityAnim = scrollX.interpolate({
                        inputRange: [
                            (i - 1) * ITEM_WIDTH,
                            i * ITEM_WIDTH,
                            (i + 1) * ITEM_WIDTH,
                        ],
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp',
                    });

                    return (
                        <Animated.View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    transform: [{ scaleX: scaleXAnim }],
                                    opacity: opacityAnim
                                },
                                i === currentIndex && { backgroundColor: '#d4af7a' }
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 480,
        justifyContent: 'center',
        alignItems: 'center',
        width: SCREEN_WIDTH,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        gap: 12,
    },
    dot: {
        height: 8,
        width: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
});
