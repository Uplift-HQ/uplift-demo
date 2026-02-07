import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  CameraIcon,
  PhoneIcon,
  ChevronLeftIcon,
  AlertCircleIcon,
  CoffeeIcon,
  SunIcon,
  CloudIcon,
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatUKPhone, formatTemperature } from '../../constants/ukFormatters';
import { api } from '../../services/api';
import {
  offlineApi,
  isOnline as getIsOnline,
  subscribeToConnectivity,
  subscribeToSync,
  getQueueLength,
} from '../../services/offline';
import { useClockStatus } from '../../hooks/useData';
import { showAlert } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ClockStep = 'location' | 'selfie' | 'confirm' | 'success';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const ClockInOutScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { data: clockStatus, loading: statusLoading, refetch } = useClockStatus();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [distanceFromStore, setDistanceFromStore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [clockStep, setClockStep] = useState<ClockStep>('location');
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [networkOnline, setNetworkOnline] = useState(getIsOnline());
  const [pendingQueueCount, setPendingQueueCount] = useState(getQueueLength());
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Location comes from shift data or user's assigned location from API
  const shift = route?.params?.shift;
  const shiftLocation = shift?.location ? {
    id: shift.locationId || 'loc-1',
    name: shift.location,
    city: shift.city || '',
    postcode: shift.postcode || '',
    lat: shift.lat || 0,
    lon: shift.lon || 0,
    geofenceRadius: shift.geofenceRadius || 100,
  } : null;
  const [nearestLocation, setNearestLocation] = useState(shiftLocation || {
    id: 'loc-default',
    name: t('screens.clockInOut.yourLocation', 'Your Location'),
    city: '',
    postcode: '',
    lat: 0,
    lon: 0,
    geofenceRadius: 100,
  });
  const weather = { temp: 8, condition: 'cloudy', description: 'Overcast' };

  // -------------------- Connectivity subscription (M-C3) --------------------
  useEffect(() => {
    const unsub = subscribeToConnectivity((online: boolean) => setNetworkOnline(online));
    const unsubSync = subscribeToSync({
      onComplete: () => { setPendingQueueCount(getQueueLength()); refetch?.(); },
    });
    return () => { unsub(); unsubSync(); };
  }, []);

  // -------------------- Real GPS location (M-C4) --------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) { setLocationError(t('screens.clockInOut.locationPermissionDenied')); setLocationLoading(false); }
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!mounted) return;
        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;
        setUserLat(lat);
        setUserLon(lon);
        // Use shift location if available, otherwise use current GPS position
        let distance = 0;
        let radius = 100;
        if (shiftLocation && shiftLocation.lat !== 0) {
          distance = haversineDistance(lat, lon, shiftLocation.lat, shiftLocation.lon);
          radius = shiftLocation.geofenceRadius;
          setNearestLocation(shiftLocation);
          setDistanceFromStore(Math.round(distance));
        } else {
          // No shift location - just use user's current position
          setNearestLocation({
            id: 'loc-current',
            name: t('screens.clockInOut.currentLocation', 'Current Location'),
            city: '',
            postcode: '',
            lat,
            lon,
            geofenceRadius: 100,
          });
          setDistanceFromStore(0);
        }
        setIsWithinGeofence(distance <= radius);
        setLocationLoading(false);
      } catch (err: any) {
        if (mounted) { setLocationError(err.message || t('screens.clockInOut.failedToGetLocation')); setLocationLoading(false); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Pulse animation for live indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Sync with API clock status
  useEffect(() => {
    if (clockStatus) {
      setIsClockedIn(clockStatus.isClocked);
      if (clockStatus.entry) {
        setCurrentEntryId(clockStatus.entry.id);
        const clockInTime = new Date(clockStatus.entry.clockIn).getTime();
        setElapsedTime(Math.floor((Date.now() - clockInTime) / 1000));
      }
    }
  }, [clockStatus]);

  // Timer for clocked in duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isClockedIn && !isOnBreak) { interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000); }
    return () => clearInterval(interval);
  }, [isClockedIn, isOnBreak]);

  // Timer for break duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOnBreak) { interval = setInterval(() => setBreakElapsed(prev => prev + 1), 1000); }
    return () => clearInterval(interval);
  }, [isOnBreak]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // -------------------- Real camera via expo-image-picker (M-C4) --------------------
  const handleTakeSelfie = async () => {
    // When offline, skip photo verification gracefully
    if (!networkOnline) {
      showAlert(t('screens.clockInOut.offlineMode'), t('screens.clockInOut.photoVerificationSkipped'), [
        { text: t('screens.clockInOut.continueWithoutPhoto'), onPress: () => setClockStep('confirm') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert(t('screens.clockInOut.cameraPermissionRequired'), t('screens.clockInOut.pleaseAllowCameraAccess'), [
          { text: t('screens.clockInOut.skipPhoto'), onPress: () => setClockStep('confirm') },
          { text: t('common.ok') },
        ]);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelfieUri(result.assets[0].uri);
        setClockStep('confirm');
      }
    } catch (error: any) {
      showAlert(t('screens.clockInOut.cameraError'), t('screens.clockInOut.couldNotOpenCamera'), [
        { text: t('screens.clockInOut.skipPhoto'), onPress: () => setClockStep('confirm') },
        { text: t('common.ok') },
      ]);
    }
  };

  const handleClockIn = async () => {
    // When offline, allow clock-in regardless of geofence (will be verified on sync)
    if (!networkOnline) { setClockStep('selfie'); return; }
    if (!isWithinGeofence) {
      showAlert(t('screens.clockInOut.locationRequired'), t('screens.clockInOut.locationRequiredMsg', { distance: distanceFromStore ?? '?' }), [{ text: t('common.ok') }]);
      return;
    }
    setClockStep('selfie');
  };

  // -------------------- Clock in with offline queue (M-C3) --------------------
  const confirmClockIn = async () => {
    setIsSubmitting(true);
    try {
      if (networkOnline) {
        const result = await api.clockIn({
          locationId: nearestLocation.id,
          latitude: userLat ?? undefined,
          longitude: userLon ?? undefined,
          notes: selfieUri ? `Selfie: ${selfieUri}` : undefined,
        });
        setIsClockedIn(true);
        setCurrentEntryId(result.entry?.id || 'entry-1');
        setElapsedTime(0);
        setClockStep('success');
      } else {
        // Offline: queue via offline service
        const queueResult = await offlineApi.clockIn({
          locationLat: userLat ?? undefined,
          locationLng: userLon ?? undefined,
        });
        setIsClockedIn(true);
        setCurrentEntryId(queueResult.id || 'offline-entry');
        setElapsedTime(0);
        setClockStep('success');
        setPendingQueueCount(getQueueLength());
      }
      Animated.spring(successAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      setTimeout(() => { setClockStep('location'); setSelfieUri(null); }, 2000);
    } catch (error: any) {
      showAlert(t('common.error'), error.message || t('screens.clockInOut.failedClockIn'));
      setClockStep('location');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------- Clock out with offline queue (M-C3) --------------------
  const handleClockOut = () => {
    showAlert(t('screens.clockInOut.clockOut'), t('screens.clockInOut.clockOutConfirm', { time: formatTime(elapsedTime) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('screens.clockInOut.clockOut'), style: 'destructive',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            if (networkOnline) {
              await api.clockOut({ entryId: currentEntryId || '', latitude: userLat ?? undefined, longitude: userLon ?? undefined });
            } else {
              await offlineApi.clockOut({ timeEntryId: currentEntryId || '', locationLat: userLat ?? undefined, locationLng: userLon ?? undefined });
              setPendingQueueCount(getQueueLength());
            }
            setIsClockedIn(false); setElapsedTime(0); setCurrentEntryId(null);
            const offlineNote = networkOnline ? '' : ' (queued for sync)';
            showAlert(t('screens.clockInOut.clockedOutSuccess'), t('screens.clockInOut.clockedOutMessage', { time: formatTime(elapsedTime) }) + offlineNote, [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
          } catch (error: any) {
            showAlert(t('common.error'), error.message || t('screens.clockInOut.failedClockOut'));
          } finally { setIsSubmitting(false); }
        },
      },
    ]);
  };

  // -------------------- Breaks with offline queue (M-C3) --------------------
  const handleStartBreak = () => {
    showAlert(t('screens.clockInOut.startBreak'), t('screens.clockInOut.startBreakMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('screens.clockInOut.startBreak'),
        onPress: async () => {
          try {
            if (!networkOnline && currentEntryId) { await offlineApi.startBreak(currentEntryId); setPendingQueueCount(getQueueLength()); }
            setIsOnBreak(true); setBreakElapsed(0);
          } catch (error: any) { showAlert(t('common.error'), error.message || t('screens.clockInOut.failedToStartBreak')); }
        }
      }
    ]);
  };

  const handleEndBreak = () => {
    showAlert(t('screens.clockInOut.endBreak'), t('screens.clockInOut.endBreakMsg', { time: formatTimeShort(breakElapsed) }), [
      { text: t('screens.clockInOut.notYet'), style: 'cancel' },
      {
        text: t('screens.clockInOut.endBreak'),
        onPress: async () => {
          try {
            if (!networkOnline && currentEntryId) { await offlineApi.endBreak(currentEntryId); setPendingQueueCount(getQueueLength()); }
            setIsOnBreak(false); setBreakElapsed(0);
          } catch (error: any) { showAlert(t('common.error'), error.message || t('screens.clockInOut.failedToEndBreak')); }
        }
      }
    ]);
  };

  if (statusLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.momentum} />
        <Text style={styles.loadingText}>{t('screens.clockInOut.checkingStatus')}</Text>
      </View>
    );
  }

  // Success animation screen
  if (clockStep === 'success') {
    return (
      <View style={styles.successContainer}>
        <Animated.View style={[styles.successCircle, { transform: [{ scale: successAnim }] }]}>
          <CheckCircleIcon size={64} color={colors.background} />
        </Animated.View>
        <Text style={styles.successTitle}>{t('screens.clockInOut.clockedIn')}</Text>
        <Text style={styles.successTime}>{getCurrentTime()}</Text>
        <Text style={styles.successLocation}>{nearestLocation.name}</Text>
        {!networkOnline && (
          <View style={styles.offlineBadgeSuccess}>
            <Text style={styles.offlineBadgeText}>{t('screens.clockInOut.queued_offline_will_sync_automatically')}</Text>
          </View>
        )}
      </View>
    );
  }

  // Selfie step
  if (clockStep === 'selfie' && !isClockedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setClockStep('location')}>
            <ChevronLeftIcon size={24} color={colors.momentum} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.clockInOut.verificationPhoto')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.selfieContent}>
          <View style={styles.selfieInstructions}>
            <CameraIcon size={32} color={colors.momentum} />
            <Text style={styles.selfieTitle}>{t('screens.clockInOut.takeQuickSelfie')}</Text>
            <Text style={styles.selfieSubtitle}>{t('screens.clockInOut.this_helps_verify_your_attendance_make_s')}</Text>
          </View>
          <View style={styles.selfiePreviewContainer}>
            {selfieUri ? (
              <Image source={{ uri: selfieUri }} style={styles.selfiePreview as any} />
            ) : (
              <View style={styles.selfiePlaceholder}>
                <CameraIcon size={48} color={colors.slate300} />
                <Text style={styles.selfiePlaceholderText}>{t('screens.clockInOut.noPhotoTaken')}</Text>
              </View>
            )}
          </View>
          <View style={styles.selfieActions}>
            {!selfieUri ? (
              <TouchableOpacity style={styles.takeSelfieButton} onPress={handleTakeSelfie}>
                <CameraIcon size={24} color={colors.background} />
                <Text style={styles.takeSelfieText}>{t('screens.clockInOut.takePhoto')}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.retakeButton} onPress={handleTakeSelfie}>
                  <Text style={styles.retakeText}>{t('screens.clockInOut.retake')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmSelfieButton} onPress={() => setClockStep('confirm')}>
                  <CheckCircleIcon size={24} color={colors.background} />
                  <Text style={styles.confirmSelfieText}>{t('screens.clockInOut.usePhoto')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <TouchableOpacity style={styles.skipSelfieButton} onPress={() => setClockStep('confirm')}>
            <Text style={styles.skipSelfieText}>{t('screens.clockInOut.skipPhoto')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Confirm step
  if (clockStep === 'confirm' && !isClockedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setClockStep('selfie')}>
            <ChevronLeftIcon size={24} color={colors.momentum} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.clockInOut.confirmClockIn')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.confirmContent} showsVerticalScrollIndicator={false}>
          {!networkOnline && (
            <View style={styles.offlineBanner}>
              <AlertCircleIcon size={18} color={colors.warning} />
              <Text style={styles.offlineBannerText}>{t('screens.clockInOut.you_are_offline_clockin_will_be_queued_a')}</Text>
            </View>
          )}
          <View style={styles.confirmCard}>
            <Text style={styles.confirmLabel}>{t('screens.clockInOut.time')}</Text>
            <Text style={styles.confirmTime}>{getCurrentTime()}</Text>
          </View>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmLabel}>{t('screens.clockInOut.location')}</Text>
            <View style={styles.confirmLocationRow}>
              <MapPinIcon size={20} color={colors.success} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.confirmLocationName}>{nearestLocation.name}</Text>
                <Text style={styles.confirmLocationAddress}>{nearestLocation.city}, {nearestLocation.postcode}</Text>
                {distanceFromStore !== null && <Text style={styles.confirmLocationDistance}>{t('screens.clockInOut.distanceFromLocation', { distance: distanceFromStore })}</Text>}
              </View>
              <CheckCircleIcon size={24} color={colors.success} />
            </View>
          </View>
          {selfieUri && (
            <View style={styles.confirmCard}>
              <Text style={styles.confirmLabel}>{t('screens.clockInOut.verificationPhotoLabel')}</Text>
              <View style={styles.confirmSelfieRow}>
                <Image source={{ uri: selfieUri }} style={styles.confirmSelfieThumb as any} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.confirmSelfieStatus}>{t('screens.clockInOut.photoCaptured')}</Text>
                  <TouchableOpacity onPress={() => setClockStep('selfie')}>
                    <Text style={styles.confirmSelfieChange}>{t('screens.clockInOut.changePhoto')}</Text>
                  </TouchableOpacity>
                </View>
                <CheckCircleIcon size={24} color={colors.success} />
              </View>
            </View>
          )}
          <View style={styles.confirmCard}>
            <Text style={styles.confirmLabel}>{t('screens.clockInOut.shiftDetails')}</Text>
            <View style={styles.confirmShiftRow}>
              <Text style={styles.confirmShiftRole}>{shift?.role || 'Senior Server'}</Text>
              <Text style={styles.confirmShiftTime}>{shift?.startTime || '09:00'} - {shift?.endTime || '17:00'}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.finalClockInButton, isSubmitting && styles.buttonDisabled]} onPress={confirmClockIn} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color={colors.background} /> : (
              <>
                <ClockIcon size={28} color={colors.background} />
                <Text style={styles.finalClockInText}>{networkOnline ? t('screens.clockInOut.confirmClockInOnline') : t('screens.clockInOut.confirmClockInOffline')}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Main clock in/out screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeftIcon size={24} color={colors.momentum} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.clockInOut.time_clock')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Offline / queue banner */}
        {(!networkOnline || pendingQueueCount > 0) && (
          <View style={styles.offlineBanner}>
            <AlertCircleIcon size={18} color={colors.warning} />
            <Text style={styles.offlineBannerText}>
              {!networkOnline ? t('screens.clockInOut.offlineActionsQueued') : t('screens.clockInOut.pendingSync', { count: pendingQueueCount })}
            </Text>
          </View>
        )}

        {/* Timer Display */}
        <View style={[styles.timerCard, isClockedIn && styles.timerCardActive]}>
          {isClockedIn && (
            <View style={styles.liveIndicator}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>{t('screens.clockInOut.live')}</Text>
            </View>
          )}
          <Text style={[styles.timerLabel, isClockedIn && styles.timerLabelActive]}>
            {isClockedIn ? (isOnBreak ? t('screens.clockInOut.onBreak') : t('screens.clockInOut.timeWorked')) : t('screens.clockInOut.readyToStart')}
          </Text>
          <Text style={[styles.timerValue, isClockedIn && styles.timerValueActive]}>
            {isClockedIn ? (isOnBreak ? formatTimeShort(breakElapsed) : formatTime(elapsedTime)) : getCurrentTime()}
          </Text>
          {isClockedIn && (
            <Text style={styles.clockedInTime}>
              {t('screens.clockInOut.clockedInAt', { time: new Date(Date.now() - elapsedTime * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) })}
            </Text>
          )}
        </View>

        {/* Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationMapContainer}>
            <Image
              source={{ uri: `https://maps.googleapis.com/maps/api/staticmap?center=${nearestLocation.lat},${nearestLocation.lon}&zoom=16&size=600x300&maptype=roadmap&markers=color:red%7C${nearestLocation.lat},${nearestLocation.lon}&key=AIzaSyDemo` }}
              style={styles.staticMapImage}
              defaultSource={{ uri: 'https://via.placeholder.com/400x200/E8F4E8/666666?text=Loading+Map' }}
            />
            <View style={styles.mapOverlay}>
              <View style={styles.locationPinContainer}>
                <View style={styles.geofenceCircle} />
                <View style={styles.locationPin}>
                  <MapPinIcon size={24} color={colors.background} />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.locationInfo}>
            <View style={styles.locationNameRow}>
              <Text style={styles.locationName}>{nearestLocation.name}</Text>
              <View style={[styles.geofenceStatus, { backgroundColor: (locationLoading ? colors.slate300 : isWithinGeofence ? colors.success : colors.error) + '20' }]}>
                {locationLoading ? <ActivityIndicator size="small" color={colors.slate500} /> : isWithinGeofence ? <CheckCircleIcon size={14} color={colors.success} /> : <AlertCircleIcon size={14} color={colors.error} />}
                <Text style={[styles.geofenceStatusText, { color: locationLoading ? colors.slate500 : isWithinGeofence ? colors.success : colors.error }]}>
                  {locationLoading ? t('screens.clockInOut.gettingGps') : isWithinGeofence ? t('screens.clockInOut.atLocation') : distanceFromStore !== null ? t('screens.clockInOut.distanceAway', { distance: distanceFromStore }) : t('screens.clockInOut.unknownDistance')}
                </Text>
              </View>
            </View>
            <Text style={styles.locationAddress}>{nearestLocation.city}, {nearestLocation.postcode}</Text>
            <View style={styles.locationMeta}>
              <View style={styles.metaItem}>
                <PhoneIcon size={14} color={colors.slate500} />
                <Text style={styles.metaText}>{formatUKPhone('020 1234 5678')}</Text>
              </View>
              <View style={styles.metaItem}>
                <CloudIcon size={14} color={colors.slate500} />
                <Text style={styles.metaText}>{formatTemperature(weather.temp)}, {weather.description}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Geofence Warning */}
        {!locationLoading && !isWithinGeofence && distanceFromStore !== null && (
          <View style={styles.warningCard}>
            <AlertCircleIcon size={24} color={colors.error} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.warningTitle}>{t('screens.clockInOut.outside_work_location')}</Text>
              <Text style={styles.warningText}>{t('screens.clockInOut.youAreDistanceAway', { distance: distanceFromStore })}</Text>
            </View>
          </View>
        )}

        {/* Location error */}
        {locationError && (
          <View style={styles.warningCard}>
            <AlertCircleIcon size={24} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.warningTitle}>{t('screens.clockInOut.location_unavailable')}</Text>
              <Text style={styles.warningText}>{locationError}. {!networkOnline ? t('screens.clockInOut.canClockInOffline') : t('screens.clockInOut.pleaseEnableLocation')}</Text>
            </View>
          </View>
        )}

        {/* GPS Status Indicator */}
        <View style={styles.gpsIndicator}>
          <View style={styles.gpsHeader}>
            <Animated.View style={[styles.gpsPulse, { transform: [{ scale: pulseAnim }] }]} />
            <MapPinIcon size={16} color={locationLoading ? colors.slate400 : locationError ? colors.warning : colors.success} />
            <Text style={[styles.gpsActiveText, { color: locationLoading ? colors.slate400 : locationError ? colors.warning : colors.success }]}>
              {locationLoading ? t('screens.clockInOut.gpsAcquiring') : locationError ? t('screens.clockInOut.gpsUnavailable') : t('screens.clockInOut.gpsActive')}
            </Text>
          </View>
          <Text style={styles.gpsLocation}>{nearestLocation.city}, {nearestLocation.postcode}</Text>
          {distanceFromStore !== null && (
            <>
              <View style={styles.gpsDistanceRow}>
                <Text style={styles.gpsDistanceLabel}>{t('screens.clockInOut.distance_to_work')}</Text>
                <Text style={[styles.gpsDistanceValue, { color: isWithinGeofence ? colors.success : colors.warning }]}>{distanceFromStore}m</Text>
              </View>
              <Text style={[styles.gpsZoneStatus, { color: isWithinGeofence ? colors.success : colors.warning }]}>
                {isWithinGeofence ? t('screens.clockInOut.withinClockInZone') : t('screens.clockInOut.outsideClockInZone')}
              </Text>
            </>
          )}
        </View>

        {/* Main Action Button */}
        {!isClockedIn ? (
          <TouchableOpacity
            style={[styles.mainActionButton, networkOnline && !isWithinGeofence && !locationLoading && styles.mainActionButtonDisabled]}
            onPress={handleClockIn}
            disabled={networkOnline && !isWithinGeofence && !locationLoading}
          >
            <ClockIcon size={28} color={colors.background} />
            <Text style={styles.mainActionText}>{networkOnline ? t('screens.clockInOut.clockInOnline') : t('screens.clockInOut.clockInOffline')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.clockedInActions}>
            {!isOnBreak ? (
              <>
                <TouchableOpacity style={styles.breakButton} onPress={handleStartBreak}>
                  <CoffeeIcon size={22} color={colors.momentum} />
                  <Text style={styles.breakButtonText}>{t('screens.clockInOut.start_break')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clockOutButton} onPress={handleClockOut}>
                  <ClockIcon size={22} color={colors.background} />
                  <Text style={styles.clockOutText}>{t('screens.clockInOut.clock_out')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.endBreakButton} onPress={handleEndBreak}>
                <CoffeeIcon size={28} color={colors.background} />
                <Text style={styles.endBreakText}>{t('screens.clockInOut.endBreakWithTime', { time: formatTimeShort(breakElapsed) })}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Today's Tasks */}
        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>{t('screens.clockInOut.todays_activity')}</Text>
            <Text style={styles.activitySubtitle}>{t('screens.clockInOut.tasksAssigned', { count: 3 })}</Text>
          </View>
          <TouchableOpacity style={styles.taskItem} onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: 'task-1' } })}>
            <View style={[styles.taskStatus, { backgroundColor: colors.warning + '20' }]}><ClockIcon size={16} color={colors.warning} /></View>
            <View style={styles.taskContent}><Text style={styles.taskName}>{t('screens.clockInOut.opening_safety_check')}</Text><Text style={styles.taskDue}>{t('screens.clockInOut.due_by_1000_am')}</Text></View>
            <View style={styles.taskBadge}><Text style={styles.taskBadgeText}>Pending</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.taskItem} onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: 'task-2' } })}>
            <View style={[styles.taskStatus, { backgroundColor: colors.warning + '20' }]}><ClockIcon size={16} color={colors.warning} /></View>
            <View style={styles.taskContent}><Text style={styles.taskName}>{t('screens.clockInOut.restock_lobby_supplies')}</Text><Text style={styles.taskDue}>{t('screens.clockInOut.due_by_1200_pm')}</Text></View>
            <View style={styles.taskBadge}><Text style={styles.taskBadgeText}>Pending</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.taskItem} onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: 'task-3' } })}>
            <View style={[styles.taskStatus, { backgroundColor: colors.success + '20' }]}><CheckCircleIcon size={16} color={colors.success} /></View>
            <View style={styles.taskContent}><Text style={[styles.taskName, styles.taskNameComplete]}>{t('screens.clockInOut.guest_room_inspection')}</Text><Text style={styles.taskDue}>{t('screens.clockInOut.completed_at_0945_am')}</Text></View>
            <View style={[styles.taskBadge, styles.taskBadgeComplete]}><Text style={[styles.taskBadgeText, styles.taskBadgeTextComplete]}>Done</Text></View>
          </TouchableOpacity>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLink} onPress={() => navigation.navigate('Profile', { screen: 'Timesheets' })}>
            <ClockIcon size={20} color={colors.momentum} />
            <Text style={styles.quickLinkText}>{t('screens.clockInOut.my_timesheets')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink} onPress={() => navigation.navigate('Schedule')}>
            <ClockIcon size={20} color={colors.momentum} />
            <Text style={styles.quickLinkText}>{t('screens.clockInOut.view_schedule')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.body, color: colors.slate600, marginTop: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background, ...shadows.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h2, color: colors.slate900 },
  content: { flex: 1 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning + '15', marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, gap: spacing.sm },
  offlineBannerText: { ...typography.small, color: colors.slate700, flex: 1 },
  timerCard: { backgroundColor: colors.background, margin: spacing.lg, padding: spacing.xl, borderRadius: borderRadius.xl, alignItems: 'center', ...shadows.lg },
  timerCardActive: { backgroundColor: colors.momentum },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.background },
  liveText: { ...typography.small, color: colors.background, fontWeight: '800', letterSpacing: 1 },
  timerLabel: { ...typography.body, color: colors.slate600, marginBottom: spacing.sm },
  timerLabelActive: { color: colors.background, opacity: 0.8 },
  timerValue: { fontSize: 64, fontWeight: '900', color: colors.slate900, letterSpacing: -2 },
  timerValueActive: { color: colors.background },
  clockedInTime: { ...typography.caption, color: colors.background, opacity: 0.7, marginTop: spacing.md },
  locationCard: { backgroundColor: colors.background, marginHorizontal: spacing.lg, marginBottom: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.md },
  locationMapContainer: { height: 140, backgroundColor: '#E8F4E8', position: 'relative' },
  staticMapImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  mapOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  locationPinContainer: { position: 'absolute', top: '50%', left: '50%', alignItems: 'center', justifyContent: 'center' },
  geofenceCircle: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: colors.momentum + '20', borderWidth: 2, borderColor: colors.momentum + '40', transform: [{ translateX: -40 }, { translateY: -40 }] },
  locationPin: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.momentum, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -22 }, { translateY: -22 }], ...shadows.md },
  locationInfo: { padding: spacing.lg },
  locationNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  locationName: { ...typography.h3, color: colors.slate900, flex: 1 },
  geofenceStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  geofenceStatusText: { ...typography.small, fontWeight: '600' },
  locationAddress: { ...typography.body, color: colors.slate600, marginBottom: spacing.md },
  locationMeta: { flexDirection: 'row', gap: spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.caption, color: colors.slate600 },
  warningCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.error + '15', marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, borderLeftWidth: 4, borderLeftColor: colors.error },
  warningTitle: { ...typography.bodyBold, color: colors.error, marginBottom: spacing.xs },
  warningText: { ...typography.body, color: colors.slate700 },
  gpsIndicator: { backgroundColor: colors.slate50, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.slate200 },
  gpsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  gpsPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  gpsActiveText: { ...typography.small, fontWeight: '600', color: colors.success },
  gpsLocation: { ...typography.caption, color: colors.slate600, marginBottom: spacing.xs },
  gpsDistanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  gpsDistanceLabel: { ...typography.small, color: colors.slate600 },
  gpsDistanceValue: { ...typography.small, fontWeight: '700' },
  gpsZoneStatus: { ...typography.small, fontWeight: '600' },
  mainActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, marginHorizontal: spacing.lg, marginBottom: spacing.lg, paddingVertical: spacing.xl, paddingHorizontal: spacing.xl, borderRadius: borderRadius.xl, ...shadows.lg },
  mainActionButtonDisabled: { backgroundColor: colors.slate300 },
  mainActionText: { ...typography.h2, color: colors.background },
  clockedInActions: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  breakButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.background, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: colors.momentum, ...shadows.sm },
  breakButtonText: { ...typography.bodyBold, color: colors.momentum },
  clockOutButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.error, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, ...shadows.md },
  clockOutText: { ...typography.bodyBold, color: colors.background },
  endBreakButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.warning, paddingVertical: spacing.xl, borderRadius: borderRadius.xl, ...shadows.lg },
  endBreakText: { ...typography.h3, color: colors.background },
  activityCard: { backgroundColor: colors.background, marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.sm },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  activityTitle: { ...typography.h3, color: colors.slate900 },
  activitySubtitle: { ...typography.caption, color: colors.slate500 },
  taskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  taskStatus: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  taskContent: { flex: 1 },
  taskName: { ...typography.bodyBold, color: colors.slate900, marginBottom: 2 },
  taskNameComplete: { color: colors.slate500, textDecorationLine: 'line-through' },
  taskDue: { ...typography.caption, color: colors.slate500 },
  taskBadge: { backgroundColor: colors.warning + '20', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  taskBadgeComplete: { backgroundColor: colors.success + '20' },
  taskBadgeText: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  taskBadgeTextComplete: { color: colors.success },
  quickLinks: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  quickLink: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.momentum + '10', paddingVertical: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.momentum + '30' },
  quickLinkText: { ...typography.bodyBold, color: colors.momentum, fontSize: 13 },
  successContainer: { flex: 1, backgroundColor: colors.momentum, alignItems: 'center', justifyContent: 'center' },
  successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.background + '30', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  successTitle: { ...typography.h1, color: colors.background, marginBottom: spacing.sm },
  successTime: { fontSize: 48, fontWeight: '900', color: colors.background, marginBottom: spacing.sm },
  successLocation: { ...typography.body, color: colors.background, opacity: 0.8 },
  offlineBadgeSuccess: { marginTop: spacing.lg, backgroundColor: colors.background + '25', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  offlineBadgeText: { ...typography.small, color: colors.background, fontWeight: '600' },
  selfieContent: { flex: 1, padding: spacing.lg },
  selfieInstructions: { alignItems: 'center', marginBottom: spacing.xl },
  selfieTitle: { ...typography.h2, color: colors.slate900, marginTop: spacing.md, marginBottom: spacing.sm },
  selfieSubtitle: { ...typography.body, color: colors.slate600, textAlign: 'center' },
  selfiePreviewContainer: { aspectRatio: 1, backgroundColor: colors.slate100, borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: spacing.xl },
  selfiePreview: { width: '100%', height: '100%' },
  selfiePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  selfiePlaceholderText: { ...typography.body, color: colors.slate400, marginTop: spacing.md },
  selfieActions: { flexDirection: 'row', gap: spacing.md },
  takeSelfieButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg },
  takeSelfieText: { ...typography.bodyBold, color: colors.background },
  retakeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate100, paddingVertical: spacing.lg, borderRadius: borderRadius.lg },
  retakeText: { ...typography.bodyBold, color: colors.slate700 },
  confirmSelfieButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.success, paddingVertical: spacing.lg, borderRadius: borderRadius.lg },
  confirmSelfieText: { ...typography.bodyBold, color: colors.background },
  skipSelfieButton: { alignItems: 'center', paddingVertical: spacing.lg },
  skipSelfieText: { ...typography.body, color: colors.slate500, textDecorationLine: 'underline' },
  confirmContent: { flex: 1, padding: spacing.lg },
  confirmCard: { backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.sm },
  confirmLabel: { ...typography.small, color: colors.slate500, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.sm },
  confirmTime: { fontSize: 48, fontWeight: '900', color: colors.slate900 },
  confirmLocationRow: { flexDirection: 'row', alignItems: 'center' },
  confirmLocationName: { ...typography.bodyBold, color: colors.slate900 },
  confirmLocationAddress: { ...typography.caption, color: colors.slate600, marginTop: 2 },
  confirmLocationDistance: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  confirmSelfieRow: { flexDirection: 'row', alignItems: 'center' },
  confirmSelfieThumb: { width: 60, height: 60, borderRadius: borderRadius.md },
  confirmSelfieStatus: { ...typography.bodyBold, color: colors.slate900 },
  confirmSelfieChange: { ...typography.caption, color: colors.momentum, marginTop: 2 },
  confirmShiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmShiftRole: { ...typography.bodyBold, color: colors.slate900 },
  confirmShiftTime: { ...typography.body, color: colors.slate600 },
  finalClockInButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.xl, borderRadius: borderRadius.xl, marginTop: spacing.md, ...shadows.lg },
  buttonDisabled: { opacity: 0.6 },
  finalClockInText: { ...typography.h2, color: colors.background },
});
