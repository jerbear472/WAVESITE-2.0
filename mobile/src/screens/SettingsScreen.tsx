import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';
import { useAuth } from '../contexts';
import { Header, Button } from '../components';

const { colors, spacing, borderRadius, typography } = designSystem;

interface SettingRowProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

function SettingRow({
  icon,
  iconColor = colors.text.secondary,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (showChevron && onPress && (
        <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
      ))}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Settings" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="account"
              iconColor={colors.primary}
              title={user?.email || 'User'}
              subtitle={user?.organization_name || 'No organization'}
              showChevron={false}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="shield-check"
              iconColor={colors.success}
              title="Subscription"
              subtitle={`${user?.tier || 'Starter'} plan`}
              onPress={() => {}}
            />
            {user?.api_access && (
              <>
                <View style={styles.divider} />
                <SettingRow
                  icon="api"
                  iconColor={colors.warning}
                  title="API Access"
                  subtitle="Manage API keys"
                  onPress={() => {}}
                />
              </>
            )}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="bell-outline"
              title="Push Notifications"
              onPress={() => {}}
              rightElement={
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  trackColor={{ false: colors.surfaceLight, true: `${colors.primary}50` }}
                  thumbColor={colors.primary}
                />
              }
              showChevron={false}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="email-outline"
              title="Email Digest"
              subtitle="Weekly summary"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="view-compact"
              title="Compact View"
              onPress={() => {}}
              rightElement={
                <Switch
                  value={false}
                  onValueChange={() => {}}
                  trackColor={{ false: colors.surfaceLight, true: `${colors.primary}50` }}
                  thumbColor={colors.text.tertiary}
                />
              }
              showChevron={false}
            />
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Export</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="download"
              iconColor={colors.info}
              title="Export Signals"
              subtitle="Download CSV or PDF"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="webhook"
              iconColor={colors.warning}
              title="Integrations"
              subtitle="Slack, Zapier, etc."
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="help-circle-outline"
              title="Help Center"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="email-fast-outline"
              title="Contact Support"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="file-document-outline"
              title="Documentation"
              subtitle="API docs & guides"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="information-outline"
              title="Version"
              subtitle="2.0.0 (Enterprise)"
              showChevron={false}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="file-certificate-outline"
              title="Terms of Service"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="shield-lock-outline"
              title="Privacy Policy"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            icon="logout"
            fullWidth
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            WaveSight Enterprise
          </Text>
          <Text style={styles.footerSubtext}>
            The Early-Signal Layer
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    color: colors.text.primary,
  },
  settingSubtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 60,
  },
  signOutSection: {
    marginTop: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  footerSubtext: {
    ...typography.caption,
    color: colors.text.disabled,
    marginTop: spacing.xxs,
  },
});
