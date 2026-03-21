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

	// home/index page shared styles
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
});
