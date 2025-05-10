import { QRCodeService } from "./src/js/services/qrcode.js";

class LandingPage {
  constructor() {
    // DOM elements
    this.welcomeScreen = document.getElementById("welcomeScreen");
    this.joinOptions = document.getElementById("joinOptions");
    this.difficultySelect = document.getElementById("difficultySelect");
    this.hostBtn = document.getElementById("hostBtn");
    this.joinBtn = document.getElementById("joinBtn");
    this.botBtn = document.getElementById("botBtn");
    this.scanQRBtn = document.getElementById("scanQRBtn");
    this.enterCodeBtn = document.getElementById("enterCodeBtn");
    this.backToMenuBtn = document.getElementById("backToMenuBtn");
    this.backToMenuBtn2 = document.getElementById("backToMenuBtn2");
    this.qrScanner = document.getElementById("qrScanner");
    this.closeScanner = document.getElementById("closeScanner");

    // Initialize QR code service
    this.qrCodeService = new QRCodeService(this);

    // Bind event listeners
    this.hostBtn.addEventListener("click", () => this.hostGame());
    this.joinBtn.addEventListener("click", () => this.showJoinOptions());
    this.botBtn.addEventListener("click", () => this.showDifficultySelect());
    this.scanQRBtn.addEventListener("click", () => this.startQRScanner());
    this.enterCodeBtn.addEventListener("click", () => this.joinGame());
    this.backToMenuBtn.addEventListener("click", () =>
      this.showWelcomeScreen()
    );
    this.backToMenuBtn2.addEventListener("click", () =>
      this.showWelcomeScreen()
    );
    this.closeScanner.addEventListener("click", () => this.stopQRScanner());

    // Add difficulty selection listeners
    document.querySelectorAll("[data-difficulty]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const difficulty = e.target.dataset.difficulty;
        this.startBotGame(difficulty);
      });
    });

    // Check for room code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get("room");
    if (roomCode) {
      this.redirectToGame(roomCode);
    }
  }

  showWelcomeScreen() {
    this.welcomeScreen.style.display = "block";
    this.joinOptions.style.display = "none";
    this.difficultySelect.style.display = "none";
    this.stopQRScanner();
  }

  showJoinOptions() {
    this.welcomeScreen.style.display = "none";
    this.joinOptions.style.display = "block";
  }

  showDifficultySelect() {
    this.welcomeScreen.style.display = "none";
    this.difficultySelect.style.display = "block";
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8);
  }

  async hostGame() {
    try {
      const roomId = this.generateRoomId();
      this.redirectToGame(roomId);
    } catch (error) {
      console.error("Error hosting game:", error);
    }
  }

  startQRScanner() {
    this.joinOptions.style.display = "none";
    this.qrScanner.style.display = "flex";
    const html5QrCode = new Html5Qrcode("scanner");
    html5QrCode
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const roomId = new URL(decodedText).searchParams.get("room");
          if (roomId) {
            this.stopQRScanner();
            this.redirectToGame(roomId);
          }
        },
        (error) => {
          // Ignore scanning errors
        }
      )
      .catch((err) => {
        console.error("Error starting QR scanner:", err);
        this.stopQRScanner();
        this.joinGame();
      });
  }

  stopQRScanner() {
    this.qrScanner.style.display = "none";
    const scanner = document.getElementById("scanner");
    if (scanner) {
      scanner.innerHTML = "";
    }
  }

  async joinGame() {
    const roomId = prompt("Enter the room code:");
    if (roomId) {
      this.redirectToGame(roomId);
    }
  }

  startBotGame(difficulty) {
    this.redirectToGame(null, { isBot: true, difficulty });
  }

  redirectToGame(roomId, options = {}) {
    const params = new URLSearchParams();
    if (roomId) {
      params.set("room", roomId);
    }
    if (options.isBot) {
      params.set("mode", "bot");
      params.set("difficulty", options.difficulty);
    }
    window.location.href = `game.html${
      params.toString() ? "?" + params.toString() : ""
    }`;
  }
}

// Initialize landing page
new LandingPage();
