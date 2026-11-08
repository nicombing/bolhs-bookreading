# Book Reading

A shared reading session web application designed specifically for virtual book clubs, literature circles, and reading groups meeting over Zoom, Google Meet, or Microsoft Teams.

🌐 **Live URL**: [https://bolhs-bookreading.vercel.app](https://bolhs-bookreading.vercel.app)

---

## 🌟 Key Features

1. **Interactive Zoom Screen Sharing**
   - Clean, distraction-free reading canvas with an elegant e-reader aesthetic.
   - **Presentation Mode (`H`)**: Hides the top bar and floating host dock completely for a clean screen share view. A subtle reveal button or pressing `H` / `Esc` brings controls back instantly.
   - **Auto-Centering Smooth Scroll**: The active paragraph automatically glides smoothly into the viewer's optimal eye-level without jerky jumping.

2. **Automatic Title Detection**
   - The first non-empty line of any pasted text is automatically identified as the chapter or book title and elevated into the header.
   - Kept completely separate from the reading loop so readers don't accidentally read the title as paragraph 1.
   - Title can be easily edited or overridden in the text loader.

3. **Paragraph-by-Paragraph Focus**
   - Text is formatted paragraph by paragraph.
   - **Active Paragraph**: Displayed in high contrast with an elegant white card background (`#ffffff`), dark slate typography (`#17202e`), subtle rounded corners, and soft ambient shadow.
   - **Surrounding Paragraphs**: Kept comfortably readable (dimmed at ~50% opacity, customizable from 30% to 80%) so participants have context without losing their place.
   - **Direct Navigation**: Clicking any dimmed paragraph instantly jumps focus to that paragraph.

4. **Cyclical Reader Rotation**
   - Input your group members' names (e.g. Alice, David, Elena, Marcus).
   - Automatically cycles through readers sequentially with every paragraph.
   - **Prominent Reader Badge**: Dynamic avatar pill with name and colorful indicator appears above the active paragraph.
   - **"Next Up" Preview**: Lets the next reader know they are on deck.
   - **"Pass Turn" (`S`)**: Easily skip a reader if their microphone is muted or they step away, without losing your paragraph progress.
   - Readers can be temporarily marked "Away", added, removed, or shuffled at any time.

5. **Seamless Host Controls & Keyboard Navigation**
   - <kbd>Space</kbd> or <kbd>→</kbd> / <kbd>PageDown</kbd>: Advance to next paragraph & reader.
   - <kbd>←</kbd> or <kbd>PageUp</kbd>: Return to previous paragraph & reader.
   - <kbd>S</kbd>: Pass turn to the next reader.
   - <kbd>H</kbd>: Toggle Presentation Mode (clean screen).
   - <kbd>F</kbd>: Toggle Fullscreen.
   - <kbd>R</kbd>: Open Reader Roster drawer.
   - <kbd>T</kbd>: Open Text / Chapter loader.
   - <kbd>?</kbd>: Open Keyboard Shortcuts cheat sheet.
   - <kbd>Home</kbd> / <kbd>End</kbd>: Jump to first / last paragraph.

6. **Custom Typography & Visual Styling**
   - Dark slate-blue backdrop (`#273245`) with `Crimson Pro` typography for an authentic, premium e-reader experience.
   - Adjustable font size (18px to 36px) — ideal for mobile Zoom participants or laptop screens.
   - Column width presets: Compact (680px), Balanced (820px), Wide (980px).
   - Optional gentle audio chime on paragraph advancement (Web Audio API synth).
   - Automatic local storage persistence: preserves your text, progress, readers, and display settings across page reloads.

---

## 🚀 How to Run

### Method 1: Instant Direct Launch (No installation required)
Simply double-click `index.html` in Windows Explorer or open it directly in Chrome, Edge, Safari, or Firefox:
```
g:\Playground\Book Reading\index.html
```

### Method 2: Local HTTP Server (Optional)
If you prefer running via a local web server:
```powershell
cd "g:\Playground\Book Reading"
npm start
```
Then visit `http://localhost:3000` in your browser.

---

## 💡 Best Practices for Zoom Screen Sharing

1. **Window Sharing vs Full Screen**: In Zoom, choose **Share Window** and select the Book Reading browser tab/window instead of sharing your entire desktop.
2. **Optimize for Text**: In Zoom's share dialog, ensure "Optimize for video clip" is unchecked for maximum text sharpness.
3. **Use Presentation Mode**: Press <kbd>H</kbd> before starting your reading session to hide all toolbar clutter and host buttons.
4. **Font Size**: If you have members reading on phones or iPads, set the font size to **26px - 30px** in Display Settings.
