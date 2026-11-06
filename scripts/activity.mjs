// Self-hosted GitHub contribution art. No dependencies, no third-party stats API.
// Run: node scripts/activity.mjs --test | --sync
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const HANDLE = "ismail-code-ai";
const THEMES = {
  dark: { bg: "#0F1013", fg: "#ECE3D8", sub: "#B7AA9C", line: "#554C46", accent: "#EE7D3D", cells: ["#292B29", "#37533C", "#427C49", "#4DAF5B", "#76DA81"] },
  light: { bg: "#EDE6DA", fg: "#202123", sub: "#706659", line: "#A79887", accent: "#C25824", cells: ["#D8CEBF", "#B9D0AF", "#86B281", "#55945B", "#226E3A"] }
};

function escapeText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function intensity(n) { return n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4; }

export function renderActivity(calendar, theme = "dark") {
  if (!Object.hasOwn(THEMES, theme)) throw new Error("Unknown theme");
  if (!calendar || !Number.isSafeInteger(calendar.totalContributions) || calendar.totalContributions < 0 || !Array.isArray(calendar.weeks)) {
    throw new Error("Invalid GitHub contribution calendar");
  }
  const c = THEMES[theme], weeks = calendar.weeks.slice(-53);
  const cells = [], months = [];
  let previousMonth = "";
  for (let column = 0; column < weeks.length; column++) {
    const week = weeks[column];
    if (!week || !Array.isArray(week.contributionDays)) throw new Error("Invalid week");
    for (const day of week.contributionDays) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0) {
        throw new Error("Invalid day from GitHub");
      }
      const date = new Date(day.date + "T00:00:00Z");
      if (Number.isNaN(date.valueOf())) throw new Error("Invalid date");
      const weekday = date.getUTCDay();
      const x = 62 + column * 14.5, y = 118 + weekday * 19.5;
      const title = escapeText(day.date + ": " + day.contributionCount + " contributions");
      cells.push('<rect x="' + x + '" y="' + y + '" width="11" height="14" rx="2" fill="' + c.cells[intensity(day.contributionCount)] + '"><title>' + title + '</title></rect>');
    }
    const first = week.contributionDays[0];
    if (first) {
      const date = new Date(first.date + "T00:00:00Z");
      const month = date.toLocaleString("en-US", { timeZone: "UTC", month: "short" }).toUpperCase();
      if (month !== previousMonth) {
        if (column > 0 && (date.getUTCDate() <= 14 || months.length === 0)) {
          months.push('<text x="' + (62 + column * 14.5) + '" y="105" font-family="monospace" font-size="14" fill="' + c.sub + '">' + month + '</text>');
        }
        previousMonth = month;
      }
    }
  }
  const total = calendar.totalContributions.toLocaleString("en-US");
  const intro = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="325" viewBox="0 0 1200 325" role="img" aria-label="GitHub contribution calendar: ' + escapeText(total) + ' contributions over the last twelve months"><title>Activity Intelligence — ' + escapeText(total) + ' GitHub contributions</title>';
  const background = '<rect width="1200" height="325" fill="' + c.bg + '"/><rect x="13" y="13" width="1174" height="299" fill="none" stroke="' + c.line + '"/>';
  const heading = '<path d="M28 69V28h45M1172 69V28h-45" stroke="' + c.accent + '" stroke-width="3" fill="none"/>' +
    '<text x="47" y="62" font-family="monospace" font-size="30" font-weight="bold" fill="' + c.fg + '">ACTIVITY INTELLIGENCE</text>' +
    '<text x="1152" y="61" text-anchor="end" font-family="monospace" font-size="18" fill="' + c.accent + '">SOURCE / GITHUB</text>' +
    '<path d="M44 79h1114" stroke="' + c.line + '"/>';
  const summary = '<path d="M864 100v182" stroke="' + c.line + '"/>' +
    '<text x="897" y="179" font-family="monospace" font-size="65" font-weight="bold" fill="' + c.accent + '">' + escapeText(total) + '</text>' +
    '<text x="897" y="215" font-family="monospace" font-size="18" fill="' + c.fg + '">CONTRIBUTIONS</text>' +
    '<text x="897" y="246" font-family="monospace" font-size="15" fill="' + c.sub + '">LAST 12 MONTHS</text>' +
    '<text x="897" y="269" font-family="monospace" font-size="13" fill="' + c.accent + '">AUTOMATED / DAILY</text>';
  return intro + background + heading + months.join("") + cells.join("") + summary + '</svg>';
}

async function synchronize() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required to fetch GitHub data");
  const query = 'query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}';
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "ismail-profile-activity" },
    body: JSON.stringify({ query, variables: { login: HANDLE } })
  });
  if (!response.ok) throw new Error("GitHub GraphQL returned HTTP " + response.status);
  const json = await response.json();
  if (json.errors?.length) throw new Error("GitHub GraphQL: " + JSON.stringify(json.errors));
  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error("GitHub returned no contribution calendar");
  for (const theme of Object.keys(THEMES)) {
    writeFileSync("assets/v2/activity-" + theme + ".svg", renderActivity(calendar, theme) + "\n", "utf8");
  }
  console.log("Synced contribution art from GitHub. Total:", calendar.totalContributions);
}

function selfTest() {
  const weeks = [
    { contributionDays: [{date:"2026-11-01", contributionCount:0}, {date:"2026-11-02", contributionCount:2}, {date:"2026-11-03", contributionCount:6}] },
    { contributionDays: [{date:"2026-11-08", contributionCount:12}, {date:"2026-11-09", contributionCount:1}] }
  ];
  for (const theme of Object.keys(THEMES)) {
    const art = renderActivity({totalContributions: 21, weeks}, theme);
    assert.match(art, /21<\/text>/);
    assert.match(art, /2026-11-08: 12 contributions/);
    assert.match(art, /<svg xmlns=/);
    assert.ok(!art.includes("<script"));
    assert.ok(art.endsWith("</svg>"));
  }
  assert.throws(() => renderActivity({totalContributions: -1, weeks}, "dark"));
  assert.throws(() => renderActivity({totalContributions: 21, weeks:[{contributionDays:[{date:"bad",contributionCount:1}]}]}, "dark"));
  console.log("PASS: theme rendering, data labels, validation, and no scripts");
}

if (process.argv.includes("--test")) selfTest();
else if (process.argv.includes("--sync")) await synchronize();
else { console.log("Usage: node scripts/activity.mjs --test | --sync"); process.exitCode = 1; }
