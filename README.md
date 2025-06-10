# MemeForge: AI-Powered Multi-Chain Meme Generator

**MemeForge is a cutting-edge application that allows users to generate memes using AI, customize them, and mint them as NFTs on various blockchain networks.**

**Live Application:** [Link to Deployed App - e.g., https://memeforge.app] (Update if available)

## ✨ Features

*   **🤖 AI-Powered Meme Generation:** Get creative suggestions for meme text.
*   **🎨 Meme Customization:** Full editor to add text, draw, and apply filters.
*   **🔗 Multi-Chain NFT Minting:** Mint your memes as NFTs on Algorand and EVM-compatible chains.
*   **🖼️ Meme Templates & Gallery:** Browse popular templates and share your creations.
*   **👑 Premium Features:** Unlock exclusive functionalities with a subscription.
*   **🔒 User Accounts:** Save your work and manage your NFTs.
*   **⚙️ Admin Dashboard:** (For project administrators) Interface for managing the application.

## 🛠️ Tech Stack

*   **Frontend:** React, Vite, TypeScript, Tailwind CSS
*   **Backend & Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
*   **Blockchain Integration:**
    *   Algorand: `algosdk`, `@perawallet/connect`
    *   EVM Chains: `ethers`, `wagmi`, `@walletconnect/client`
*   **Deployment:** Netlify (Frontend, Functions), GitHub Actions (CI/CD)
*   **Analytics & Monitoring:** Custom solution logging to Supabase, Sentry (planned)

## 🚀 Getting Started / Setup for Development

**Prerequisites:**
*   Node.js (v18.0.0 or higher)
*   npm (v8.0.0 or higher) or yarn

**1. Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/memeforge-app.git # Replace with actual repo URL
   cd memeforge-app
   ```

**2. Install Dependencies:**
   ```bash
   npm install
   ```

**3. Environment Variables:**
   - Create a `.env` file in the root of the project by copying `.env.example` (if it existed, otherwise create it manually).
   - You will need to populate it with necessary keys:
     ```env
     # Supabase
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

     # Stripe (for premium features/subscriptions)
     VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_pk_key
     # STRIPE_SECRET_KEY (used in backend functions, set in Netlify/Supabase)
     # STRIPE_WEBHOOK_SECRET (used in backend functions, set in Netlify/Supabase)

     # AI Captioning Service (if external)
     VITE_AI_CAPTION_API_ENDPOINT=your_ai_caption_service_url
     VITE_AI_CAPTION_API_KEY=your_ai_caption_service_key

     # Sentry (Error Monitoring)
     VITE_SENTRY_DSN=your_sentry_dsn
     VITE_SENTRY_ENVIRONMENT=development

     # Other relevant keys
     VITE_APP_VERSION= # From package.json or set manually
     ```
   - **Note:** Obtain these keys from your Supabase project settings, Stripe dashboard, Sentry, and any other relevant services.

**4. Run the Development Server:**
   ```bash
   npm run dev
   ```
   The application should now be running on `http://localhost:5173` (or another port if 5173 is busy).

**5. Build for Production:**
   ```bash
   npm run build
   ```
   This creates a `dist` folder with the optimized production build.

**Available Scripts:**
*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run lint`: Lints the codebase using ESLint.
*   `npm run lint:check`: Checks for linting errors without fixing.
*   `npm run type-check`: Performs TypeScript type checking.
*   `npm run preview`: Serves the production build locally.

## 📖 Basic Usage Guide

1.  **Explore Templates:** Browse the available meme templates.
2.  **Generate & Customize:** Use the AI to suggest captions or write your own. Add text, draw, and make it unique.
3.  **Connect Wallet:** Connect your preferred Algorand (Pera) or EVM-compatible wallet.
4.  **Mint as NFT:** Once you're happy with your meme, mint it as an NFT to the blockchain.
5.  **Manage Account:** Sign up or log in to save your memes, view your minted NFTs, and manage your premium subscription.

(For more detailed instructions, a `USER_GUIDE.md` may be created in the future.)

## 🤝 Contributing

We welcome contributions to MemeForge!

*   **Reporting Bugs:** Please use the GitHub Issues tracker.
*   **Suggesting Features:** Use GitHub Issues or Discussions.
*   **Pull Requests:**
    1.  Fork the repository.
    2.  Create a new branch for your feature or bugfix (e.g., `feature/new-template-source` or `fix/login-error`).
    3.  Make your changes, adhering to coding standards (run `npm run lint` before committing).
    4.  Commit your changes with clear and descriptive messages.
    5.  Push to your fork and submit a Pull Request to the `develop` branch of the main repository.

(A more detailed `CONTRIBUTING.md` with coding standards and branch strategy may be created later.)

## 📜 License

This project is licensed under the MIT License - see the `LICENSE` file for details (if a `LICENSE` file exists, otherwise state "MIT License").

## 📞 Contact & Support

*   For issues, please use the GitHub Issues tracker.
*   For other inquiries, you can reach out to `support@memeforge.app` (replace with actual support email if available).
