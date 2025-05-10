import QrCreator from "https://cdn.jsdelivr.net/npm/qr-creator/dist/qr-creator.es6.min.js";

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

      // Create QR code image using QR Server API with recommended parameters
      const params = new URLSearchParams({
        data: url,
        size: "200x200", // Default size as per API docs
        ecc: "L", // Low error correction for better compatibility
        margin: "1", // 1px margin
        qzone: "4", // Recommended quiet zone
        format: "png", // Best format for web
        color: "10b981", // Our green color
        bgcolor: "ffffff", // White background
      });

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;

      // Create and append image element
      const img = document.createElement("img");
      img.src = qrCodeUrl;
      img.alt = "QR Code";
      img.style.width = "200px"; // Match the API size
      img.style.height = "200px"; // Match the API size

      // Add error handling for image loading
      img.onerror = (error) => {
        console.error("Failed to load QR code image:", error);
        this.generateFallbackQRCode(url, qrCodeDiv);
      };

      // Add loading animation
      qrCodeDiv.classList.add("loading");

      // Append the image
      qrCodeDiv.appendChild(img);

      // Remove loading animation after a delay
      setTimeout(() => {
        qrCodeDiv.classList.remove("loading");
      }, 1000);
    } catch (error) {
      console.error("Error generating QR code:", error);
      this.game.updateStatus("Error generating QR code. Please try again.");
    }
  }

  generateFallbackQRCode(url, container) {
    try {
      console.log("Using fallback QR code generation");
      // Create a text-based fallback
      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "fallback-qr";
      fallbackDiv.innerHTML = `
        <div class="room-code">
          <h3>Room Code:</h3>
          <div class="code">${this.game.roomId}</div>
        </div>
        <div class="room-url">
          <h3>Room URL:</h3>
          <div class="url">${url}</div>
        </div>
      `;
      container.appendChild(fallbackDiv);
    } catch (error) {
      console.error("Error generating fallback QR code:", error);
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
