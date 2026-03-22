import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { type ReactNode } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
  showBack?: boolean;
  onBack?: () => void;
  titleAlign?: "left" | "center";
};

type AuthFieldProps = TextInputProps & {
  label: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  suffix?: ReactNode;
};

export const AuthField = React.forwardRef<TextInput, AuthFieldProps>(
  function AuthField(
    {
      label,
      helper,
      containerStyle,
      inputStyle,
      suffix,
      ...inputProps
    },
    ref,
  ) {
    return (
      <View style={[authStyles.fieldGroup, containerStyle]}>
        <Text style={authStyles.fieldLabel}>{label}</Text>
        <View style={authStyles.fieldShell}>
          <TextInput
            ref={ref}
            placeholderTextColor="rgba(214, 236, 255, 0.42)"
            style={[
              authStyles.fieldInput,
              suffix ? authStyles.fieldInputWithSuffix : null,
              inputStyle,
            ]}
            {...inputProps}
          />
          {suffix ? <View style={authStyles.fieldSuffix}>{suffix}</View> : null}
        </View>
        {helper ? <Text style={authStyles.fieldHelper}>{helper}</Text> : null}
      </View>
    );
  },
);

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  eyebrow,
  showBack = false,
  onBack,
  titleAlign = "left",
}: AuthLayoutProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  const isCentered = titleAlign === "center";

  return (
    <View style={authStyles.screenRoot}>
      <ImageBackground
        source={require("../../assets/oc/bgImage.png")}
        style={authStyles.backdrop}
        imageStyle={authStyles.backdropImage}
        resizeMode="cover"
      >
        <View style={authStyles.backdropTint} />
      </ImageBackground>

      <View style={authStyles.orbTop} />
      <View style={authStyles.orbBottom} />

      <SafeAreaView style={authStyles.foregroundLayer}>
        <KeyboardAvoidingView
          style={authStyles.foregroundLayer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
        >
          <ScrollView
            style={authStyles.foregroundLayer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={authStyles.scrollContent}
          >
            <View style={authStyles.content}>
              <View style={authStyles.topRow}>
                {showBack ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleBack}
                    style={({ pressed }) => [
                      authStyles.backButton,
                      pressed && authStyles.pressed,
                    ]}
                  >
                    <MaterialIcons
                      name="arrow-back-ios-new"
                      size={16}
                      color="#EAF6FF"
                    />
                    <Text style={authStyles.backButtonText}>Back</Text>
                  </Pressable>
                ) : (
                  <View style={authStyles.topSpacer} />
                )}

                <View style={authStyles.brandPill}>
                  <Image
                    source={require("../../assets/oc/logo.jpg")}
                    style={authStyles.brandLogo}
                  />
                  <Text style={authStyles.brandText}>Safety on Speed</Text>
                </View>
              </View>

              <View
                style={[
                  authStyles.heroBlock,
                  isCentered ? authStyles.heroBlockCentered : null,
                ]}
              >
                {eyebrow ? (
                  <Text
                    style={[
                      authStyles.eyebrow,
                      isCentered ? authStyles.textCentered : null,
                    ]}
                  >
                    {eyebrow}
                  </Text>
                ) : null}
                <Text
                  style={[
                    authStyles.title,
                    isCentered ? authStyles.textCentered : null,
                  ]}
                >
                  {title}
                </Text>
                <Text
                  style={[
                    authStyles.subtitle,
                    isCentered ? authStyles.textCentered : null,
                  ]}
                >
                  {subtitle}
                </Text>
              </View>

              <View style={authStyles.card}>{children}</View>
              {footer ? <View style={authStyles.footer}>{footer}</View> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  screenRoot: {
    backgroundColor: "#041C32",
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropImage: {
    opacity: 0.22,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 28, 50, 0.8)",
  },
  orbTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(0, 184, 240, 0.18)",
  },
  orbBottom: {
    position: "absolute",
    bottom: -140,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(27, 126, 213, 0.16)",
  },
  foregroundLayer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 28,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
  },
  topSpacer: {
    width: 88,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: "#EAF6FF",
    fontSize: 15,
    fontWeight: "600",
  },
  brandPill: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  brandText: {
    color: "#EAF6FF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroBlock: {
    marginTop: 26,
    marginBottom: 20,
  },
  heroBlockCentered: {
    alignItems: "center",
  },
  eyebrow: {
    color: "#74D7FF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  title: {
    color: "#F5FBFF",
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  subtitle: {
    color: "rgba(222, 240, 255, 0.8)",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 540,
  },
  textCentered: {
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(5, 18, 35, 0.78)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#00111F",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 8,
  },
  formGrid: {
    gap: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: "#DDEEFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  fieldShell: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    paddingHorizontal: 16,
  },
  fieldInput: {
    color: "#F5FBFF",
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
    paddingVertical: 16,
  },
  fieldInputWithSuffix: {
    paddingRight: 10,
  },
  fieldSuffix: {
    marginLeft: 8,
  },
  fieldHelper: {
    color: "rgba(194, 219, 237, 0.72)",
    fontSize: 13,
    lineHeight: 19,
  },
  toggleText: {
    color: "#74D7FF",
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1B7ED5",
    borderRadius: 18,
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: "#F5FBFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  secondaryText: {
    color: "rgba(214, 236, 255, 0.75)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  footer: {
    marginTop: 18,
  },
  footerBlock: {
    alignItems: "center",
    gap: 10,
  },
  footerLink: {
    color: "#74D7FF",
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  footerMutedLink: {
    color: "#DDEEFF",
    fontSize: 15,
    fontWeight: "600",
  },
  supportingText: {
    color: "rgba(214, 236, 255, 0.72)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  otpGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 6,
  },
  otpBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  otpBoxActive: {
    borderColor: "#74D7FF",
    shadowColor: "#74D7FF",
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  otpBoxFilled: {
    backgroundColor: "rgba(27, 126, 213, 0.16)",
  },
  otpDigit: {
    color: "#F5FBFF",
    fontSize: 22,
    fontWeight: "700",
  },
  hiddenOtpInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendLink: {
    color: "#74D7FF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.86,
  },
});
