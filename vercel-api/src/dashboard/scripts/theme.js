/**
 * Theme Controller
 * 
 * Manages light/dark theme switching, preference persistence,
 * and chart theme updates for the PostCrafter dashboard.
 * 
 * @package PostCrafter
 * @version 1.0.0
 */

class ThemeController {
  constructor() {
    this.currentTheme = 'light';
    this.systemPreference = this.getSystemPreference();
    this.storageKey = 'postcrafter-dashboard-theme';
    
    this.initializeTheme();
    this.bindEvents();
  }

  /**
   * Initialize theme system
   */
  initializeTheme() {
    // Load saved theme or use system preference
    const savedTheme = this.getSavedTheme();
    const initialTheme = savedTheme || this.systemPreference;
    
    this.setTheme(initialTheme, false);
    this.updateToggleButton();
    
    console.log(`🎨 Theme initialized: ${this.currentTheme}`);
  }

  /**
   * Get system color scheme preference
   */
  getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Get saved theme from localStorage
   */
  getSavedTheme() {
    try {
      return localStorage.getItem(this.storageKey);
    } catch (error) {
      console.warn('Unable to access localStorage for theme preference');
      return null;
    }
  }

  /**
   * Save theme to localStorage
   */
  saveTheme(theme) {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (error) {
      console.warn('Unable to save theme preference to localStorage');
    }
  }

  /**
   * Set the current theme
   */
  setTheme(theme, save = true) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }

    const previousTheme = this.currentTheme;
    this.currentTheme = theme;

    // Update document data attribute
    document.body.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme);
    
    // Save preference
    if (save) {
      this.saveTheme(theme);
    }

    // Update UI elements
    this.updateToggleButton();
    this.updateChartThemes();
    
    // Emit theme change event
    this.emitThemeChangeEvent(theme, previousTheme);
    
    console.log(`🎨 Theme changed: ${previousTheme} → ${theme}`);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Update theme toggle button
   */
  updateToggleButton() {
    const toggleButton = document.getElementById('theme-toggle');
    if (!toggleButton) return;

    const icon = toggleButton.querySelector('i');
    if (icon) {
      // Update icon based on current theme
      icon.setAttribute('data-feather', this.currentTheme === 'light' ? 'moon' : 'sun');
      
      // Re-render feather icons
      if (window.feather) {
        window.feather.replace();
      }
    }

    // Update button title
    toggleButton.title = `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} theme`;
    toggleButton.setAttribute('aria-label', `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} theme`);
  }

  /**
   * Update meta theme-color for mobile browsers
   */
  updateMetaThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }

    const colors = {
      light: '#FFFFFF',
      dark: '#1F2937'
    };

    metaThemeColor.content = colors[theme];
  }

  /**
   * Update chart themes
   */
  updateChartThemes() {
    // Access dashboard controller if available
    if (window.dashboardController && window.dashboardController.charts) {
      window.dashboardController.charts.forEach((chart, chartId) => {
        if (chart && typeof chart.updateOptions === 'function') {
          chart.updateOptions({ theme: this.currentTheme });
        }
      });
    }

    // Update summary cards themes
    if (window.dashboardController && window.dashboardController.summaryCards) {
      window.dashboardController.summaryCards.forEach((card, cardId) => {
        if (card && typeof card.updateOptions === 'function') {
          card.updateOptions({ theme: this.currentTheme });
        }
      });
    }

    // Update activity logs themes
    if (window.dashboardController && window.dashboardController.activityLogs) {
      window.dashboardController.activityLogs.forEach((log, logId) => {
        if (log && typeof log.updateOptions === 'function') {
          log.updateOptions({ theme: this.currentTheme });
        }
      });
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Theme toggle button
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => this.toggleTheme());
    }

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => this.handleSystemThemeChange(e));
    }

    // Keyboard shortcut (Ctrl/Cmd + Shift + T)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  /**
   * Handle system theme preference changes
   */
  handleSystemThemeChange(mediaQuery) {
    // Only update if user hasn't set a manual preference
    const savedTheme = this.getSavedTheme();
    if (!savedTheme) {
      const newSystemPreference = mediaQuery.matches ? 'dark' : 'light';
      this.systemPreference = newSystemPreference;
      this.setTheme(newSystemPreference, false);
      console.log(`🎨 System theme changed: ${newSystemPreference}`);
    }
  }

  /**
   * Emit theme change event
   */
  emitThemeChangeEvent(newTheme, previousTheme) {
    const event = new CustomEvent('themeChanged', {
      detail: {
        theme: newTheme,
        previousTheme,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Check if current theme is dark
   */
  isDarkTheme() {
    return this.currentTheme === 'dark';
  }

  /**
   * Check if current theme is light
   */
  isLightTheme() {
    return this.currentTheme === 'light';
  }

  /**
   * Reset theme to system preference
   */
  resetToSystemPreference() {
    // Remove saved preference
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Unable to remove theme preference from localStorage');
    }

    // Set to current system preference
    this.setTheme(this.getSystemPreference(), false);
  }

  /**
   * Add theme change listener
   */
  onThemeChange(callback) {
    document.addEventListener('themeChanged', callback);
  }

  /**
   * Remove theme change listener
   */
  offThemeChange(callback) {
    document.removeEventListener('themeChanged', callback);
  }

  /**
   * Get theme CSS variables
   */
  getThemeVariables() {
    const style = getComputedStyle(document.documentElement);
    
    return {
      primary: style.getPropertyValue('--color-primary').trim(),
      secondary: style.getPropertyValue('--color-secondary').trim(),
      success: style.getPropertyValue('--color-success').trim(),
      warning: style.getPropertyValue('--color-warning').trim(),
      error: style.getPropertyValue('--color-error').trim(),
      info: style.getPropertyValue('--color-info').trim(),
      bgPrimary: style.getPropertyValue('--bg-primary').trim(),
      bgSecondary: style.getPropertyValue('--bg-secondary').trim(),
      textPrimary: style.getPropertyValue('--text-primary').trim(),
      textSecondary: style.getPropertyValue('--text-secondary').trim(),
      borderPrimary: style.getPropertyValue('--border-primary').trim()
    };
  }

  /**
   * Apply custom theme colors
   */
  applyCustomColors(colors) {
    const root = document.documentElement;
    
    Object.entries(colors).forEach(([property, value]) => {
      if (property.startsWith('--')) {
        root.style.setProperty(property, value);
      } else {
        // Convert camelCase to CSS custom property format
        const cssProperty = `--${property.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssProperty, value);
      }
    });

    // Update charts after color change
    setTimeout(() => this.updateChartThemes(), 100);
  }

  /**
   * Reset custom colors
   */
  resetCustomColors() {
    const root = document.documentElement;
    const customProperties = [
      '--color-primary', '--color-secondary', '--color-success',
      '--color-warning', '--color-error', '--color-info',
      '--bg-primary', '--bg-secondary', '--text-primary',
      '--text-secondary', '--border-primary'
    ];

    customProperties.forEach(property => {
      root.style.removeProperty(property);
    });

    // Update charts after color reset
    setTimeout(() => this.updateChartThemes(), 100);
  }

  /**
   * Create theme animation
   */
  animateThemeTransition() {
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }

  /**
   * Destroy theme controller
   */
  destroy() {
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
      toggleButton.removeEventListener('click', this.toggleTheme);
    }

    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.removeEventListener('change', this.handleSystemThemeChange);
    }

    document.removeEventListener('keydown', this.handleKeyboardShortcut);
  }
}

/**
 * Theme Preset Manager
 */
class ThemePresetManager {
  constructor(themeController) {
    this.themeController = themeController;
    this.presets = this.getDefaultPresets();
  }

  /**
   * Get default theme presets
   */
  getDefaultPresets() {
    return {
      default: {
        name: 'Default',
        light: {
          '--color-primary': '#3B82F6',
          '--color-secondary': '#8B5CF6'
        },
        dark: {
          '--color-primary': '#60A5FA',
          '--color-secondary': '#A78BFA'
        }
      },
      ocean: {
        name: 'Ocean',
        light: {
          '--color-primary': '#0EA5E9',
          '--color-secondary': '#06B6D4'
        },
        dark: {
          '--color-primary': '#38BDF8',
          '--color-secondary': '#22D3EE'
        }
      },
      forest: {
        name: 'Forest',
        light: {
          '--color-primary': '#059669',
          '--color-secondary': '#10B981'
        },
        dark: {
          '--color-primary': '#34D399',
          '--color-secondary': '#6EE7B7'
        }
      },
      sunset: {
        name: 'Sunset',
        light: {
          '--color-primary': '#EA580C',
          '--color-secondary': '#F59E0B'
        },
        dark: {
          '--color-primary': '#FB923C',
          '--color-secondary': '#FBBF24'
        }
      },
      purple: {
        name: 'Purple',
        light: {
          '--color-primary': '#7C3AED',
          '--color-secondary': '#A855F7'
        },
        dark: {
          '--color-primary': '#A78BFA',
          '--color-secondary': '#C084FC'
        }
      }
    };
  }

  /**
   * Apply theme preset
   */
  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      console.warn(`Theme preset '${presetName}' not found`);
      return;
    }

    const currentTheme = this.themeController.getCurrentTheme();
    const colors = preset[currentTheme] || preset.light;
    
    this.themeController.applyCustomColors(colors);
    
    console.log(`🎨 Applied theme preset: ${preset.name} (${currentTheme})`);
  }

  /**
   * Get available presets
   */
  getPresets() {
    return Object.keys(this.presets).map(key => ({
      key,
      name: this.presets[key].name
    }));
  }

  /**
   * Add custom preset
   */
  addPreset(key, preset) {
    this.presets[key] = preset;
  }

  /**
   * Remove preset
   */
  removePreset(key) {
    if (key !== 'default') {
      delete this.presets[key];
    }
  }
}

// Initialize theme controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.themeController = new ThemeController();
  window.themePresetManager = new ThemePresetManager(window.themeController);
  
  console.log('🎨 Theme controller initialized');
  console.log('💡 Keyboard shortcut: Ctrl/Cmd + Shift + T to toggle theme');
});

// Export for use in other modules
export { ThemeController, ThemePresetManager };