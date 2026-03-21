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
});
