
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src', 'lib', 'settings.json');

export interface AppSettings {
  notificationTemplates: {
    awardAnnouncement: string;
  };
}

const defaultSettings: AppSettings = {
  notificationTemplates: {
    awardAnnouncement: `
      <h1>Congratulations, {{{vendorName}}}!</h1>
      <p>You have been awarded the contract for the requisition: <strong>{{{requisitionTitle}}}</strong>.</p>
      <p>Please log in to your vendor portal to review the award and take the next steps.</p>
      <a href="{{{portalLink}}}">Click here to view the award</a>
      <p>Thank you for your submission.</p>
      <p>Sincerely,<br/>The Nib Procurement Team</p>
    `,
  },
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    const settings = JSON.parse(fileContent);
    // Merge with defaults to ensure all keys are present
    return {
      ...defaultSettings,
      ...settings,
      notificationTemplates: {
        ...defaultSettings.notificationTemplates,
        ...settings.notificationTemplates,
      },
    };
  } catch (error) {
    // If the file doesn't exist or is invalid, return default settings
    console.warn('Settings file not found or invalid, using default settings.');
    return defaultSettings;
  }
}

export async function updateSettings(newSettings: Partial<AppSettings>): Promise<void> {
  const currentSettings = await getSettings();
  const updatedSettings = {
    ...currentSettings,
    ...newSettings,
    notificationTemplates: {
      ...currentSettings.notificationTemplates,
      ...newSettings.notificationTemplates,
    },
  };
  await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(updatedSettings, null, 2), 'utf-8');
}
