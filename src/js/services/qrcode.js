export class QRCodeService {
  constructor(game) {
    this.game = game;
    this.scanner = null;
  }

  async generateQRCode(url) {
    try {
      const qrCodeDiv = document.getElementById("qrCode");
      if (!qrCodeDiv) {
        console.error("QR code container not found");
        return;
      }

      // Clear any existing QR code
      qrCodeDiv.innerHTML = "";

      // Generate QR code
      const qr = new QRCode(qrCodeDiv, {
        text: url,
        width: 128,
        height: 128,
        colorDark: "#10b981",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });

      // Add loading animation
      qrCodeDiv.classList.add("loading");
      setTimeout(() => {
        qrCodeDiv.classList.remove("loading");
      }, 1000);
    } catch (error) {
      console.error("Error generating QR code:", error);
      this.game.updateStatus("Error generating QR code. Please try again.");
    }
  }

  startScanner() {
    try {
      const scannerDiv = document.getElementById("qrScanner");
      if (!scannerDiv) {
        console.error("QR scanner container not found");
        return;
      }

      // Show scanner container
      scannerDiv.style.display = "block";

      // Initialize scanner
      this.scanner = new Html5Qrcode("qrScanner");
      this.scanner
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            this.handleScanSuccess(decodedText);
          },
          (error) => {
            // Ignore scanning errors
          }
        )
        .catch((error) => {
          console.error("Error starting QR scanner:", error);
          this.game.updateStatus(
            "Error starting QR scanner. Please try again."
          );
          this.stopScanner();
        });
    } catch (error) {
      console.error("Error initializing QR scanner:", error);
      this.game.updateStatus(
        "Error initializing QR scanner. Please try again."
      );
    }
  }

  stopScanner() {
    if (this.scanner) {
      this.scanner
        .stop()
        .then(() => {
          const scannerDiv = document.getElementById("qrScanner");
          if (scannerDiv) {
            scannerDiv.style.display = "none";
          }
          this.scanner = null;
        })
        .catch((error) => {
          console.error("Error stopping QR scanner:", error);
        });
    }
  }

  handleScanSuccess(decodedText) {
    try {
      // Extract room code from URL
      const url = new URL(decodedText);
      const roomCode = url.searchParams.get("room");

      if (roomCode) {
        this.stopScanner();
        this.game.joinGame(roomCode);
      } else {
        this.game.updateStatus("Invalid QR code. Please try again.");
      }
    } catch (error) {
      console.error("Error processing scanned QR code:", error);
      this.game.updateStatus("Invalid QR code. Please try again.");
    }
  }
}
