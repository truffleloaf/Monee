# Monee

**An AI-powered cross-border financial simulator for international students.**

[Live Demo](https://monee-global.vercel.app/) · [GitHub Repository](https://github.com/truffleloaf/Monee)

Monee helps international students understand how today's financial decisions may affect their future. Instead of simply tracking their current balance, users can explore different financial scenarios, compare possible outcomes, and plan ahead before making real financial decisions.

Managing money across countries and currencies can be challenging. Exchange-rate changes, tuition fees, living expenses, irregular family transfers, and part-time income can all affect a student's financial stability. Monee brings these factors together in one platform to make financial planning more understandable and practical.

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)
- [License](#license)

## Features

### 1. Cross-Border Currency Converter

Convert between supported currencies to help international students understand the value of their money across countries.

- Select the currencies for conversion.
- View the corresponding converted amount.
- Retrieve exchange-rate data through the configured exchange-rate service.
- Understand how currency movements can affect future spending power.

**Exchange-rate note:** Exchange-rate availability and update frequency depend on the configured data provider. Do not assume rates are real-time unless the provider explicitly supports it.

### 2. Money Hub

A central place for users to explore their financial information and plan their finances.

- Review relevant financial information.
- Organise the information used for financial planning.
- Access the tools available for managing a student's financial situation.

The exact information available depends on the application's current implementation and account configuration.

### 3. Future Lab

Explore hypothetical financial scenarios and compare how different circumstances may affect future finances.

Example scenarios include:

- What if my home currency weakens by 5%?
- What if my tuition fees increase by RM1,000?
- What if I start earning part-time income next month?
- What if my family sends money every two weeks instead of monthly?
- What if I pay my tuition fees early?
- What if I face an unexpected expense?

The goal is to help students identify potential cash shortfalls, understand the effects of different assumptions, and compare possible financial outcomes before committing to a decision.

### 4. User Authentication

The application includes sign-up and sign-in functionality supported by its configured authentication service.

Authentication and account-related functionality depend on the correct backend configuration and environment variables.

### 5. Responsive User Interface

Monee is designed as a modern fintech experience, with an emphasis on clarity, accessible financial information, and a clean interface across desktop and mobile devices.

## How It Works

Monee follows a simple financial-planning workflow:

1. **Set up your financial picture.** Enter or select the relevant financial information supported by the application.
2. **Choose a scenario.** Adjust assumptions such as exchange rates, tuition fees, income, or unexpected expenses.
3. **Compare possible outcomes.** Review how changing an assumption may affect your projected finances.
4. **Understand the impact.** Identify potential risks, such as a future cash shortfall.
5. **Plan ahead.** Compare alternatives before making an actual financial decision.

The results are projections based on the assumptions and data available to the application, not guarantees of future outcomes.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Web application framework |
| React | User interface |
| TypeScript | Type-safe application development |
| Supabase | Authentication and backend services, where configured |
| Frankfurter API | Exchange-rate data, where configured |
| Vercel | Hosting and deployment |
| npm | Dependency management and scripts |

Refer to `package.json` and the project source code for the exact versions, dependencies, and integrations currently in use.

## Getting Started

### Prerequisites

Before running the project locally, install:

- [Node.js](https://nodejs.org/) — use a version compatible with the project's Next.js version.
- npm, which is included with Node.js.
- [Git](https://git-scm.com/).
- A Supabase project if you want to run features that require Supabase authentication or backend services.

Check your installed versions:

```bash
node -v
npm -v
git --version
```

### 1. Clone the Repository

```bash
git clone https://github.com/truffleloaf/Monee.git
cd Monee
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project's root directory.

Add the environment variables required by the application. See [Environment Variables](#environment-variables) below.

### 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The development server usually reloads automatically when you save changes to the source files.

## Environment Variables

Some functionality may require environment variables to connect to external services.

Create a `.env.local` file in the root directory and add the variables expected by the project's Supabase client configuration.

For example, a Supabase setup using the current publishable-key convention may use:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

**Important:** These names are examples, not a guarantee of the exact variable names in this repository. Check the existing source code and any `.env.example` file. If the application uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` or another name, configure the variable that the code actually reads.

| Variable | Purpose | Required when |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase features are enabled |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client key in the example configuration above | The code expects this variable |
| Other application-specific variables | Additional integrations or backend configuration | Required by the relevant feature |

Never commit `.env.local` or other files containing secrets to GitHub. Never expose a Supabase service-role key in client-side code.

See the [Supabase Next.js documentation](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) for backend configuration guidance.

## Running the Application

### Development

```bash
npm run dev
```

Runs the application locally with development features enabled.

### Production Build

```bash
npm run build
```

Compiles the application for production. Resolve build errors before deploying.

### Production Preview

After a successful build:

```bash
npm run start
```

Opens the production build locally, usually at `http://localhost:3000`.

### Linting and Type Checking

Run these checks if the corresponding scripts or tools are configured in `package.json`:

```bash
npm run lint
npx tsc --noEmit
```

The lint command may differ depending on the project's Next.js and ESLint configuration. Check the available scripts before relying on it.

## Testing

Testing should cover both the user interface and the financial functionality. The following manual test cases provide a baseline for checking changes before deployment.

### Manual Test Cases

| ID | Test | Expected Result |
|---|---|---|
| TC-01 | Open the homepage | The homepage loads without a blank screen or runtime error. |
| TC-02 | Navigate between available pages | Navigation leads to the correct pages. |
| TC-03 | Open the currency converter | The converter and currency selection controls are displayed. |
| TC-04 | Convert between two supported currencies | The displayed amount matches the selected exchange rate and conversion calculation. |
| TC-05 | Enter an invalid or empty amount | Invalid input is handled clearly without breaking the interface. |
| TC-06 | Simulate an exchange-rate service failure | The application handles the error gracefully and does not display a misleading successful result. |
| TC-07 | Register a new account | Valid registration follows the configured authentication flow. |
| TC-08 | Sign in with valid credentials | The user can authenticate successfully. |
| TC-09 | Sign in with invalid credentials | The application shows an appropriate error message. |
| TC-10 | Sign out | The user's session is ended according to the authentication implementation. |
| TC-11 | Open Money Hub | The page loads and displays the information available to the user. |
| TC-12 | Open Future Lab | The scenario interface loads and accepts supported inputs. |
| TC-13 | Change a financial scenario | The displayed projection updates according to the implemented calculation logic. |
| TC-14 | Test mobile screen sizes | Content remains readable and controls are usable without unintended horizontal overflow. |
| TC-15 | Refresh a page directly | The page loads correctly, and protected pages respect authentication rules. |
| TC-16 | Build the project | The production build completes without errors. |

**Test status:** These are proposed test cases, not a claim that every test has already been executed or passed.

### Financial Calculation Checks

Financial calculations should also be tested independently of the user interface.

For a simple currency conversion:

```text
Converted Amount = Source Amount × Exchange Rate
```

Example:

```text
Source Amount: 100
Exchange Rate: 3.50
Converted Amount: 350.00
```

The rate in this example is illustrative and is not a live market quote.

For scenario simulations, verify that:

- A change to an input produces the expected change in the projection.
- Currency conversions use the correct direction of the exchange rate.
- Rounding is applied consistently.
- Repeated calculations with the same inputs produce consistent results.
- Missing, stale, or unavailable data is handled appropriately.
- Any displayed cash shortfall is calculated from the actual projected balance and relevant expenses.

### Recommended Pre-Deployment Checks

Before merging a change or deploying a new version:

- [ ] Install dependencies successfully.
- [ ] Run the production build.
- [ ] Run the configured lint and type-check commands.
- [ ] Test the affected feature manually.
- [ ] Check browser console and server logs for errors.
- [ ] Verify required environment variables.
- [ ] Confirm that authentication and user-specific data behave correctly.
- [ ] Check the deployed application on desktop and mobile.

Automated unit and end-to-end tests can be added as the project grows. Do not treat the manual checklist as an automated test suite.

## Deployment

Monee is deployed at:

**Production URL:** https://monee-global.vercel.app/

The following instructions explain how to deploy the GitHub repository to Vercel.

### Option 1: Deploy Through Vercel

#### Step 1: Open Vercel

Visit [Vercel](https://vercel.com/) and sign in.

#### Step 2: Import the GitHub Repository

1. Open the Vercel dashboard.
2. Select **Add New → Project**.
3. Import `truffleloaf/Monee`.
4. If the repository is not listed, check the GitHub integration and repository access permissions.

#### Step 3: Configure the Project

Use the following settings unless the repository requires something different:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `./` |
| Production Branch | `main`, if this is the repository's default production branch |
| Install Command | `npm install`, or Vercel's detected default |
| Build Command | `npm run build` |

Vercel normally detects Next.js automatically.

#### Step 4: Add Environment Variables

In the Vercel project's environment-variable settings, add the required variables from your local configuration.

Configure them for the appropriate environments:

- Production
- Preview
- Development, if needed

Use the same variable names expected by the application. Do not copy secret values into the README or commit them to GitHub.

#### Step 5: Deploy

Select **Deploy** and wait for the build to finish.

If the deployment succeeds, Vercel will provide a deployment URL.

#### Step 6: Verify the Deployment

Open the deployed website and check:

- The homepage loads.
- Page navigation works.
- Currency conversion behaves correctly.
- Sign-up and sign-in work if configured.
- Money Hub and Future Lab load.
- There are no critical browser-console or server errors.
- Mobile layouts work correctly.

### Option 2: Deploy Updates Through Git

Once the repository is connected to Vercel, push changes to GitHub to trigger deployments.

```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

A push to the configured production branch normally triggers a production deployment. Changes pushed to other branches can generate preview deployments, depending on the Vercel configuration.

Review the deployment logs if a build fails.

## Troubleshooting

### `npm` or `node` Is Not Recognised

Install Node.js from [nodejs.org](https://nodejs.org/), then restart the terminal and verify:

```bash
node -v
npm -v
```

### `next: command not found`

Install the project dependencies from the repository root:

```bash
npm install
npm run dev
```

### Build Fails Because of Fonts or Network Access

If the build cannot retrieve a remote font, check the font configuration in the application layout and the relevant build logs. Remote font downloads may require network access during the build.

Use a supported local-font or fallback-font configuration if appropriate.

### Supabase Authentication Does Not Work

Check that:

- The Supabase project URL and client key are correct.
- The variable names match those referenced in the source code.
- The variables are configured in the relevant Vercel environment.
- Authentication redirect URLs and allowed site URLs include the appropriate development or production URL.
- Database access policies are configured correctly for any user-specific data.

After changing Vercel environment variables, redeploy the application so the new configuration takes effect.

### Vercel Cannot Find the Production Branch

Check that the repository contains commits and that the configured production branch exists.

For example:

```bash
git branch
git status
git log -1 --oneline
```

Push the intended branch to GitHub and confirm that Vercel is connected to the correct repository.

### Currency Conversion Does Not Work

Check the exchange-rate provider's availability, API response, supported currencies, and error handling. Confirm that the application does not assume an unavailable rate is zero or silently present an outdated rate as current.

## Security

- Keep private credentials and secret keys out of source control.
- Use environment variables for deployment configuration.
- Never expose privileged database credentials to the browser.
- Configure appropriate authentication, authorisation, and Row Level Security policies for private user data.
- Validate and sanitise user inputs where appropriate.
- Avoid logging passwords, access tokens, or sensitive financial information.
- Do not use real personal financial information when testing unless the environment and data handling have been appropriately secured.

## Contributing

Contributions and improvements are welcome.

### Suggested Workflow

1. Fork the repository or create a feature branch.
2. Make changes in a separate branch.
3. Test the affected functionality.
4. Run the production build and applicable code-quality checks.
5. Commit your changes with a descriptive message.
6. Push the branch and open a pull request.

Example:

```bash
git checkout -b feature/improve-currency-converter
git add .
git commit -m "Improve currency converter"
git push origin feature/improve-currency-converter
```

For collaborative development, use pull requests to review changes before merging them into the production branch.

## Roadmap

Potential future improvements include:

- [ ] Expand currency and country coverage.
- [ ] Improve exchange-rate history and rate-change visualisations.
- [ ] Add more configurable financial scenarios.
- [ ] Improve projected cash-flow and shortfall analysis.
- [ ] Add automated unit and end-to-end tests.
- [ ] Improve accessibility and mobile usability.
- [ ] Strengthen error handling and financial-data validation.
- [ ] Enhance personalisation for international students.

This roadmap describes possible improvements and does not imply that these features are already implemented.

## Disclaimer

Monee is a financial-planning and simulation project intended for educational and informational purposes. Its projections depend on the inputs, exchange-rate data, assumptions, and calculation methods used by the application. Monee does not guarantee future exchange rates or financial outcomes and should not be treated as a substitute for professional financial advice.

