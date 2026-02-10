# Uplift Mobile App - Apple Review Notes

## Demo Login Instructions

The app includes a **Demo Mode** for reviewers to test all features without requiring real credentials.

### How to Access Demo Mode

1. Launch the app
2. On the Login screen, you will see two demo buttons:
   - **"Worker View"** - Access the employee/worker experience
   - **"Manager View"** - Access the manager/supervisor experience
3. Tap either button to instantly log in with demo data

### No Network Required

Demo mode uses local mock data and does not require network connectivity. All screens will display realistic sample data.

---

## Key Screens to Test

### Worker View (Employee Experience)

| Tab | Screen | Description |
|-----|--------|-------------|
| **Home** | Dashboard | Overview with upcoming shifts, tasks, activity feed |
| **Schedule** | Schedule Overview | Weekly calendar with shifts |
| **Schedule** | Clock In/Out | Location-based time tracking with selfie |
| **Schedule** | Shift Marketplace | Available open shifts to claim |
| **Schedule** | Time Off Request | Request vacation/sick days |
| **Tasks** | Task List | Assigned tasks with status |
| **Tasks** | Task Detail | Individual task with subtasks |
| **Tasks** | Task Execution | Step-by-step task completion |
| **Career** | Career Path | Skills progression and roles |
| **Career** | Rewards | Points and redeemable rewards |
| **Career** | Leaderboard | Team rankings |
| **Career** | Badges | Earned achievements |
| **More** | Profile | Personal settings and info |
| **More** | Expenses | Submit and track expense claims |
| **More** | Payslips | View pay history |
| **More** | Compliance | Certifications and training |
| **More** | Learning | Training courses |
| **More** | Documents | Company documents and policies |
| **More** | Performance | Performance reviews and goals |
| **More** | Surveys | Employee feedback surveys |

### Manager View (Supervisor Experience)

| Tab | Screen | Description |
|-----|--------|-------------|
| **Dashboard** | Manager Dashboard | Team overview, alerts, metrics |
| **Schedule** | Schedule Builder | Create and manage team schedules |
| **Schedule** | Team Schedule | View all team members' schedules |
| **Tasks** | Task List | Team tasks and assignments |
| **Team** | Job Postings | Open positions and hiring |
| **More** | Approvals | Time off, expenses, shift swaps |
| **More** | Reports | Analytics and reporting |
| **More** | AI Insights | AI-powered recommendations |
| **More** | Reward Catalog | Manage employee rewards |
| **More** | Team Performance | Team metrics and reviews |
| **More** | Offboarding | Employee departure management |

---

## Expected Behavior

### Navigation
- All screens have a **back button** (← Back) or **bottom tab navigation** visible
- No "dead end" screens where the user cannot navigate away
- Swipe-back gesture works on all stack screens

### Data Display
- All screens show realistic demo data
- No empty states or error messages in demo mode
- Numbers, dates, and text are all properly formatted

### Interactions
- Buttons provide visual feedback when tapped
- Forms can be filled out (submissions are simulated)
- Pull-to-refresh works where applicable
- Modal dialogs can be dismissed

### iPad Support
- App renders correctly in both portrait and landscape
- Layout adapts to iPad screen size
- No truncated text or overlapping elements

---

## Technical Notes

- **Minimum iOS Version**: iOS 15.0+
- **Supported Devices**: iPhone, iPad
- **Orientation**: Portrait and Landscape supported
- **Network**: Demo mode works offline
- **Authentication**: Demo mode bypasses real authentication

---

## Contact

For any questions during the review process:
- Email: support@uplifthq.co.uk
