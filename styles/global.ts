import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({
  // news page styles
  screenContainer: {
    flex: 1,
  },
  screenScrollView: {
    flex: 1,
  },
  card: {
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 15,
    padding: 15,
    borderLeftColor: "#0494CB",
    borderLeftWidth: 1,
    borderBottomWidth: 2,
    borderRightWidth: 1,
    shadowColor: "#0494CB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  bodyContainer: {
    marginBottom: 15,
  },
  bodyText: {
    fontSize: 14,
    marginBottom: 10,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 20,
  },
  floatingActionButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0494CB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0494CB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },

  // create post modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 10,
    textAlign: "center",
  },
  inputBase: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  inputSubject: {
    marginBottom: 12,
    fontWeight: "600",
    fontSize: 16,
  },
  inputBody: {
    minHeight: 100,
  },
  mediaContainer: {
    borderRadius: 15,
    marginBottom: 15,
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: 150,
    borderRadius: 10,
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 15,
    padding: 5,
  },
  createPostActionButtons: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 15,
  },
  actionButtonInline: {
    padding: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionLabel: {
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#0494CB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0494CB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: "#5E85AF",
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // index page styles
  homeContainer: {
    flex: 1,
  },
  homeContent: {
    padding: 20,
    paddingBottom: 48,
    paddingTop: 52,
  },
  homeHeroHeader: {
    marginBottom: 18,
  },
  homeKicker: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  homeTitle: {
    fontSize: 38,
    fontWeight: "900",
    marginBottom: 8,
  },
  homeSubtitle: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 560,
  },
  homeHeroCard: {
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 22,
    padding: 22,
  },
  homeHelperText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 18,
    textAlign: "center",
  },
  homeStatusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },
  homeStatusCard: {
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 140,
    padding: 18,
    width: "48%",
  },
  homeStatusCardWide: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    width: "100%",
  },
  homeStatusLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  homeStatusValue: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 10,
  },
  homeStatusHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  homeActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeActionButton: {
    borderRadius: 22,
    minHeight: 132,
    padding: 18,
    width: "48%",
  },
  homeActionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  homeActionText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  // profile page styles
  profileContent: {
    padding: 20,
    paddingBottom: 50,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 25,
    marginTop: 10,
  },
  profileAvatarContainer: {
    position: "relative",
    borderWidth: 2,
    borderRadius: 60,
    padding: 2,
    marginBottom: 12,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "white",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    opacity: 0.6,
  },
  profileSectionContainer: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  profileSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 16,
    marginTop: 12,
    marginBottom: 8,
    opacity: 0.5,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  profileRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  profileRowLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  profileLogoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  profileLogoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  profileVersionText: {
    textAlign: "center",
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 20,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileFullScreenAvatar: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  profileModalCloseHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 8,
  },
  profileModalCloseText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  profilePickerContainer: {
    width: "80%",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  profileModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  profileDistrictItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
    width: "100%",
    alignItems: "center",
  },
  profileCloseButton: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },

  // login page styles
  loginScreenRoot: {
    flex: 1,
    backgroundColor: "#012A4A",
  },
  loginForegroundLayer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loginScrollContent: {
    flexGrow: 1,
  },
  loginBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loginBackdropImage: {
    opacity: 0.3,
  },
  loginBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1, 42, 74, 0.36)",
  },
  loginContent: {
    flex: 1,
    paddingHorizontal: 34,
    paddingTop: 72,
    paddingBottom: 30,
  },
  loginHeader: {
    alignItems: "center",
    marginBottom: 56,
  },
  loginTitle: {
    fontSize: 58,
    fontWeight: "300",
    lineHeight: 64,
    color: "#EAF6FF",
  },
  loginSubtitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "300",
    color: "rgba(234, 246, 255, 0.88)",
  },
  loginForm: {
    gap: 26,
  },
  loginFieldGroup: {
    gap: 12,
  },
  loginFieldLabel: {
    fontSize: 22,
    fontWeight: "300",
    lineHeight: 28,
    color: "#EAF6FF",
  },
  loginInputFrame: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 13,
  },
  loginInput: {
    fontSize: 22,
    fontWeight: "300",
    lineHeight: 28,
    color: "#EAF6FF",
    paddingVertical: 0,
  },
  loginInputUnderline: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(206, 226, 241, 0.78)",
    marginTop: 10,
  },
  loginBottomArea: {
    marginTop: 20,
    alignItems: "center",
  },
  loginSubmitButton: {
    minWidth: 172,
    borderRadius: 10,
    backgroundColor: "#1b7ed5",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 30,
    paddingVertical: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.26,
    shadowRadius: 8,
    elevation: 4,
  },
  loginSubmitButtonDisabled: {
    opacity: 0.6,
  },
  loginSubmitButtonText: {
    fontSize: 19,
    fontWeight: "300",
    lineHeight: 24,
    color: "#EAF6FF",
    textAlign: "center",
  },
  loginLinks: {
    marginTop: 46,
    alignItems: "center",
    gap: 10,
  },
  loginLinkText: {
    fontSize: 19,
    fontWeight: "400",
    color: "#00B8F0",
    textAlign: "center",
  },
  loginLinkUnderline: {
    textDecorationLine: "underline",
  },

  // edit profile page styles
  editProfileLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  editProfileContainer: {
    paddingVertical: 12,
    flex: 1,
  },
  editProfileScrollContent: {
    paddingBottom: 40,
  },
  editProfileImageContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  editProfileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  editProfileCameraIconContainer: {
    position: "absolute",
    bottom: 25,
    right: "36%",
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  editProfileChangePhotoText: {
    marginTop: 10,
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  editProfileForm: {
    paddingHorizontal: 24,
  },
  editProfileInputGroup: {
    marginBottom: 20,
  },
  editProfileLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#a7a7a7",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editProfileInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  editProfileInputIcon: {
    marginRight: 10,
  },
  editProfileInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  editProfileActionContainer: {
    marginTop: 10,
    paddingHorizontal: 24,
  },
  editProfileSaveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  editProfileSaveButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },

  // extra page styles
  extraScreen: {
    flex: 1,
  },
  extraScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  extraBackRow: {
    marginBottom: 12,
  },
  extraTitleBlock: {
    marginBottom: 16,
  },
  extraTitleText: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "700",
  },
  extraGpsHint: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  extraSection: {
    marginBottom: 16,
  },
  extraSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  extraSectionDivider: {
    height: 1,
    marginBottom: 10,
  },
  extraGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  extraCard: {
    width: "49%",
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },
  extraCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 80,
  },
  extraCardInfo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 8,
  },
  extraCardName: {
    fontSize: 12,
    marginTop: 7,
    textAlign: "center",
    fontWeight: "600",
  },
  extraCardActions: {
    flex: 1,
    paddingLeft: 8,
    justifyContent: "center",
  },
  extraActionButton: {
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  extraActionButtonMap: {
    marginTop: 10,
  },
  extraActionText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});

export default function GlobalStylesRoute() {
  return null;
}
