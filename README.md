⚙️ Admin README: MemeForge - Admin & Operations Guide
This guide provides essential information for administrators and the operations team to manage, monitor, and maintain the MemeForge application.

🚀 Deployment
MemeForge utilizes a robust CI/CD pipeline for automated deployments. Refer to the .github/workflows/ci-cd.yml file for the GitHub Actions workflow configuration.

Staging Deployments: Pushes to the develop branch trigger deployments to the staging environment.
Production Deployments: Merges to the main branch trigger deployments to the production environment.
For a detailed pre-deployment checklist and environment configurations, consult the PRODUCTION_CHECKLIST.md file.

📊 Monitoring
Comprehensive monitoring is in place to track application health, performance, errors, and user activity.

1. Application Health
Health Check Endpoint:
URL: https://your-memeforge-domain.com/health (e.g., https://memeforge.app/health)
Purpose: Provides real-time status of the application and its dependencies (database, storage, external APIs).
Implementation: Handled by netlify/functions/health.ts.
2. Performance Monitoring
Core Web Vitals: Tracked and reported via src/utils/monitoring.ts and src/utils/analytics.ts. Key metrics like LCP, FID, CLS are captured.
Lighthouse CI: Integrated into the CI/CD pipeline (.github/workflows/ci-cd.yml) to run performance audits on every pull request and production deployment. Reports are available in GitHub Actions.
Custom Performance Metrics: src/utils/analytics.ts and src/utils/monitoring.ts capture various performance metrics (e.g., meme_generation, template_fetch, nft_mint_blockchain) and store them in the Supabase events table.
Query Example:

SELECT event_name, properties->>'metric_value' as duration_ms, timestamp
FROM events
WHERE event_name LIKE 'performance_metric%'
ORDER BY timestamp DESC;
3. Error Monitoring
Client-Side Errors:
ErrorBoundary: src/components/ErrorBoundary.tsx catches React component errors and logs them.
Global Error Handlers: src/utils/monitoring.ts captures unhandled JavaScript errors and promise rejections.
Supabase events Table: All errors are logged as error_occurred events.
Query Example:

SELECT event_name, properties->>'error_message' as message, properties->>'component' as component, timestamp
FROM events
WHERE event_name = 'error_occurred'
ORDER BY timestamp DESC;
CSP Violations:
Endpoint: https://your-memeforge-domain.com/csp-report
Purpose: Receives reports when the Content Security Policy is violated.
Implementation: Handled by netlify/functions/csp-report.ts. These reports are logged to Netlify functions logs.
Sentry (Placeholder): The application is set up to integrate with Sentry for advanced error tracking. Configure VITE_SENTRY_DSN in .env.production and complete the integration in src/components/ErrorBoundary.tsx and src/utils/monitoring.ts.
4. User Activity Monitoring
Supabase events Table: All key user actions (e.g., template_selected, meme_generated, nft_mint_success, meme_liked, user_logged_in) are tracked and stored in the events table.
Query Example:

SELECT event_name, user_id, session_id, properties, timestamp
FROM events
ORDER BY timestamp DESC
LIMIT 100;
This table is your primary source for understanding user behavior and application usage patterns.
🤝 Managing Sponsored Content
MemeForge includes a sponsored content system to monetize the platform. Management and monitoring of sponsored content are primarily done through direct database interaction and analytics.

1. Database Tables
sponsors: Stores information about sponsoring entities.
sponsored_templates: Links specific meme templates to sponsors, including active dates and priority.
sponsored_watermarks: Stores branded watermarks provided by sponsors.
ad_impressions: Records every time a sponsored template or watermark is displayed to a user.
ad_clicks: Records every time a user clicks on a sponsored link (from a template or watermark).
2. Adding/Updating Sponsored Content
Currently, adding or updating sponsors, templates, or watermarks requires direct interaction with the Supabase database (via Supabase Studio or SQL queries).

To add a new sponsor: Insert a new row into the sponsors table.
To add a sponsored template: Insert a new row into sponsored_templates, linking it to an existing sponsor_id. Ensure start_date, end_date, and is_active are correctly set.
To add a sponsored watermark: Insert a new row into sponsored_watermarks, linking it to an existing sponsor_id.
Activating/Deactivating Campaigns: Update the is_active, start_date, and end_date columns in sponsored_templates and sponsored_watermarks to control campaign visibility.
3. Monitoring Sponsored Content Performance
You can monitor the performance of sponsored content by querying the ad_impressions and ad_clicks tables, as well as the general events table.

Impressions (Views):

SELECT
    s.name AS sponsor_name,
    ai.content_type,
    COUNT(ai.id) AS total_impressions
FROM
    ad_impressions ai
JOIN
    sponsors s ON ai.sponsor_id = s.id
WHERE
    ai.timestamp >= '2025-01-01' -- Adjust date range as needed
GROUP BY
    s.name, ai.content_type
ORDER BY
    total_impressions DESC;
Clicks:

SELECT
    s.name AS sponsor_name,
    ac.content_type,
    ac.link_url,
    COUNT(ac.id) AS total_clicks
FROM
    ad_clicks ac
JOIN
    sponsors s ON ac.sponsor_id = s.id
WHERE
    ac.timestamp >= '2025-01-01' -- Adjust date range as needed
GROUP BY
    s.name, ac.content_type, ac.link_url
ORDER BY
    total_clicks DESC;
Click-Through Rate (CTR): To calculate CTR, you would typically join impressions and clicks for a given sponsor/content type over a period. This might require more complex SQL queries or external data processing.
Usage within App (from events table):
Sponsored Template Selections:

SELECT
    e.properties->>'template_name' AS template_name,
    e.properties->>'sponsor_id' AS sponsor_id,
    COUNT(e.id) AS selections
FROM
    events e
WHERE
    e.event_name = 'template_selected'
    AND e.properties->>'is_sponsored' = 'true'
GROUP BY
    template_name, sponsor_id
ORDER BY
    selections DESC;
Sponsored Watermark Applications:

SELECT
    e.properties->>'watermark_sponsor_id' AS sponsor_id,
    COUNT(e.id) AS watermark_applications
FROM
    events e
WHERE
    e.event_name = 'meme_generated'
    AND e.properties->>'has_watermark' = 'true'
    AND e.properties->>'watermark_sponsor_id' IS NOT NULL
GROUP BY
    sponsor_id
ORDER BY
    watermark_applications DESC;
💰 Managing Subscriptions
Subscription management is handled through the plans and subscriptions tables in Supabase, integrated with Stripe.

Plans: The plans table defines your premium tiers. You can add/update plans directly in this table. Ensure stripe_product_id and stripe_price_id are correctly linked to your Stripe products/prices.
Subscriptions: The subscriptions table tracks user subscriptions. This table is primarily updated by the stripe-webhook Supabase Edge Function.
Stripe Dashboard: For detailed customer and subscription management (e.g., refunds, manual cancellations, viewing payment history), the Stripe Dashboard is the primary tool.
Supabase Edge Functions:
supabase/functions/create-checkout-session/index.ts: Handles the creation of Stripe Checkout sessions when a user initiates a subscription.
supabase/functions/stripe-webhook/index.ts: Crucial for keeping your Supabase subscriptions table synchronized with Stripe events (e.g., checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed). Ensure this webhook is correctly configured in your Stripe Dashboard to point to your deployed Supabase Edge Function URL.
🛠️ What Still Needs to Be Done
While MemeForge is production-ready, here are areas for future development and improvement:

Dedicated Admin Dashboard: Implement a user interface for administrators to easily manage sponsors, sponsored content, plans, and view analytics without direct database access.
Full Stripe Webhook Implementation: The provided supabase/functions/create-checkout-session/index.ts and supabase/functions/stripe-webhook/index.ts are functional but may require further refinement and error handling for all edge cases in a production Stripe integration.
Comprehensive Test Suite:
Unit Tests: Write unit tests for individual functions and components (e.g., src/utils/analytics.ts, src/context/MemeContext.tsx).
Integration Tests: Test the interaction between different parts of the application (e.g., meme creation flow, NFT minting process).
End-to-End (E2E) Tests: Use tools like Playwright or Cypress to simulate user journeys through the entire application.
Sentry Integration Completion: Fully configure Sentry DSNs in production environments and ensure all error reporting is correctly routed to Sentry for centralized error monitoring and alerting.
Robust Image Storage: Replace the uploadToImgBB service with a more scalable and controlled solution like Supabase Storage or AWS S3 for storing generated memes.
NFT Contract Deployment: Deploy actual NFT smart contracts on the target Algorand and EVM chains. Update the contractAddress placeholders in src/utils/blockchain/chains.ts with the deployed contract addresses.
AI Caption Backend Scalability: Ensure the netlify-ai-caption-backend.netlify.app service is robust, scalable, and secure for production use, or consider hosting it yourself.
User Profile/Dashboard: Enhance the "Account" tab (src/components/SubscriptionManager.tsx) to include a more comprehensive user profile, showing their minted NFTs, liked memes, saved memes, and activity history.
User Feedback System: Implement a mechanism for users to submit feedback, bug reports, or feature requests directly from the application.
Internationalization (i18n): Add support for multiple languages to cater to a global audience.
Accessibility (a11y) Audit: Conduct a thorough accessibility audit to ensure the application is usable by individuals with disabilities.
