/**
 * Dashboard Navigation Controller
 * 
 * Handles navigation between dashboard sections, sidebar behavior,
 * and mobile menu functionality.
 * 
 * @package PostCrafter
 * @version 1.0.0
 */

class NavigationController {
  constructor() {
    this.currentSection = 'overview';
    this.isSidebarOpen = false;
    this.isMobile = window.innerWidth < 640;
    
    this.initializeElements();
    this.bindEvents();
    this.updateActiveSection();
    this.handleResize();
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    this.sidebarToggle = document.getElementById('sidebar-toggle');
    this.sidebar = document.getElementById('dashboard-sidebar');
    this.navLinks = document.querySelectorAll('.nav-link[data-section]');
    this.contentSections = document.querySelectorAll('.content-section');
    this.pageTitle = document.getElementById('page-title');
    this.pageDescription = document.getElementById('page-description');
    this.dashboardContainer = document.getElementById('dashboard-container');
    
    // Create sidebar overlay for mobile
    this.createSidebarOverlay();
  }

  /**
   * Create sidebar overlay for mobile
   */
  createSidebarOverlay() {
    this.sidebarOverlay = document.createElement('div');
    this.sidebarOverlay.className = 'sidebar-overlay';
    this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
    document.body.appendChild(this.sidebarOverlay);
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Sidebar toggle
    if (this.sidebarToggle) {
      this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
    }

    // Navigation links
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => this.handleNavClick(e));
    });

    // Handle escape key to close sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isSidebarOpen) {
        this.closeSidebar();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());

    // Handle URL hash changes
    window.addEventListener('hashchange', () => this.handleHashChange());

    // Handle initial hash
    if (window.location.hash) {
      this.handleHashChange();
    }
  }

  /**
   * Handle navigation link clicks
   */
  handleNavClick(e) {
    e.preventDefault();
    const link = e.currentTarget;
    const section = link.dataset.section;
    
    if (section && section !== this.currentSection) {
      this.navigateToSection(section);
    }

    // Close sidebar on mobile after navigation
    if (this.isMobile) {
      this.closeSidebar();
    }
  }

  /**
   * Navigate to a specific section
   */
  navigateToSection(section) {
    if (!this.isValidSection(section)) {
      console.warn(`Invalid section: ${section}`);
      return;
    }

    const previousSection = this.currentSection;
    this.currentSection = section;

    // Update URL hash
    window.history.pushState(null, '', `#${section}`);

    // Update active states
    this.updateActiveNavLink();
    this.updateActiveSection();
    this.updatePageHeader();

    // Emit custom navigation event
    this.emitNavigationEvent(section, previousSection);

    // Track analytics (if implemented)
    this.trackNavigation(section);
  }

  /**
   * Check if section is valid
   */
  isValidSection(section) {
    return document.getElementById(`${section}-section`) !== null;
  }

  /**
   * Update active navigation link
   */
  updateActiveNavLink() {
    this.navLinks.forEach(link => {
      const section = link.dataset.section;
      const isActive = section === this.currentSection;
      
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  /**
   * Update active content section
   */
  updateActiveSection() {
    this.contentSections.forEach(section => {
      const sectionId = section.id.replace('-section', '');
      const isActive = sectionId === this.currentSection;
      
      section.classList.toggle('active', isActive);
      section.setAttribute('aria-hidden', !isActive);
      
      if (isActive) {
        section.focus();
        this.onSectionActivated(sectionId);
      }
    });
  }

  /**
   * Update page header based on current section
   */
  updatePageHeader() {
    const sectionData = this.getSectionData(this.currentSection);
    
    if (this.pageTitle) {
      this.pageTitle.textContent = sectionData.title;
    }
    
    if (this.pageDescription) {
      this.pageDescription.textContent = sectionData.description;
    }

    // Update document title
    document.title = `${sectionData.title} - PostCrafter Dashboard`;
  }

  /**
   * Get section metadata
   */
  getSectionData(section) {
    const sectionMap = {
      overview: {
        title: 'Overview',
        description: 'Monitor your PostCrafter API performance and usage statistics'
      },
      'api-usage': {
        title: 'API Usage',
        description: 'Detailed analysis of API endpoint usage, request patterns, and performance metrics'
      },
      publishes: {
        title: 'Publishing Analytics',
        description: 'Track successful publishes, publishing trends, and content performance'
      },
      errors: {
        title: 'Error Analysis',
        description: 'Monitor errors, analyze error patterns, and track resolution status'
      },
      activity: {
        title: 'Activity Monitoring',
        description: 'Real-time activity feed and detailed event tracking'
      },
      performance: {
        title: 'Performance Metrics',
        description: 'Analyze response times, throughput, and system performance'
      },
      users: {
        title: 'User Analytics',
        description: 'Track user activity, usage patterns, and engagement metrics'
      },
      reports: {
        title: 'Reports & Export',
        description: 'Generate and export detailed reports for analysis and sharing'
      },
      health: {
        title: 'System Health',
        description: 'Monitor system health, uptime, and service status'
      },
      logs: {
        title: 'System Logs',
        description: 'View and search through system logs and audit trails'
      }
    };

    return sectionMap[section] || {
      title: 'Dashboard',
      description: 'PostCrafter monitoring and analytics'
    };
  }

  /**
   * Handle URL hash changes
   */
  handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash && hash !== this.currentSection) {
      this.navigateToSection(hash);
    }
  }

  /**
   * Toggle sidebar open/closed
   */
  toggleSidebar() {
    if (this.isSidebarOpen) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  /**
   * Open sidebar
   */
  openSidebar() {
    this.isSidebarOpen = true;
    this.sidebar.classList.add('show');
    this.sidebarOverlay.classList.add('show');
    
    // Update toggle button aria-expanded
    if (this.sidebarToggle) {
      this.sidebarToggle.setAttribute('aria-expanded', 'true');
    }

    // Trap focus in sidebar
    this.trapFocus(this.sidebar);
  }

  /**
   * Close sidebar
   */
  closeSidebar() {
    this.isSidebarOpen = false;
    this.sidebar.classList.remove('show');
    this.sidebarOverlay.classList.remove('show');
    
    // Update toggle button aria-expanded
    if (this.sidebarToggle) {
      this.sidebarToggle.setAttribute('aria-expanded', 'false');
    }

    // Return focus to toggle button
    if (this.sidebarToggle && document.activeElement.closest('.dashboard-sidebar')) {
      this.sidebarToggle.focus();
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 640;

    // Close sidebar when switching from mobile to desktop
    if (wasMobile && !this.isMobile && this.isSidebarOpen) {
      this.closeSidebar();
    }

    // Update container classes
    this.updateContainerClasses();
  }

  /**
   * Update dashboard container classes
   */
  updateContainerClasses() {
    if (this.dashboardContainer) {
      this.dashboardContainer.classList.toggle('mobile', this.isMobile);
      this.dashboardContainer.classList.toggle('sidebar-open', this.isSidebarOpen);
    }
  }

  /**
   * Trap focus within an element
   */
  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    });

    firstElement.focus();
  }

  /**
   * Called when a section is activated
   */
  onSectionActivated(section) {
    // Trigger any section-specific initialization
    const event = new CustomEvent('sectionActivated', {
      detail: { section, timestamp: Date.now() }
    });
    document.dispatchEvent(event);
  }

  /**
   * Emit navigation event
   */
  emitNavigationEvent(currentSection, previousSection) {
    const event = new CustomEvent('navigationChanged', {
      detail: {
        currentSection,
        previousSection,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Track navigation for analytics
   */
  trackNavigation(section) {
    // Implement analytics tracking here
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: this.getSectionData(section).title,
        page_location: `${window.location.origin}${window.location.pathname}#${section}`
      });
    }
  }

  /**
   * Get current section
   */
  getCurrentSection() {
    return this.currentSection;
  }

  /**
   * Check if mobile view
   */
  isMobileView() {
    return this.isMobile;
  }

  /**
   * Programmatically navigate to section
   */
  goToSection(section) {
    this.navigateToSection(section);
  }

  /**
   * Add navigation listener
   */
  onNavigationChange(callback) {
    document.addEventListener('navigationChanged', callback);
  }

  /**
   * Remove navigation listener
   */
  offNavigationChange(callback) {
    document.removeEventListener('navigationChanged', callback);
  }

  /**
   * Destroy navigation controller
   */
  destroy() {
    // Remove event listeners
    this.navLinks.forEach(link => {
      link.removeEventListener('click', this.handleNavClick);
    });

    if (this.sidebarToggle) {
      this.sidebarToggle.removeEventListener('click', this.toggleSidebar);
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('hashchange', this.handleHashChange);
    document.removeEventListener('keydown', this.handleEscapeKey);

    // Remove sidebar overlay
    if (this.sidebarOverlay && this.sidebarOverlay.parentNode) {
      this.sidebarOverlay.parentNode.removeChild(this.sidebarOverlay);
    }
  }
}

/**
 * Keyboard Navigation Handler
 */
class KeyboardNavigationHandler {
  constructor(navigationController) {
    this.nav = navigationController;
    this.bindKeyboardShortcuts();
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when not in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Alt + number keys for quick navigation
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const shortcuts = {
          '1': 'overview',
          '2': 'api-usage',
          '3': 'publishes',
          '4': 'errors',
          '5': 'activity',
          '6': 'performance',
          '7': 'users',
          '8': 'reports',
          '9': 'health',
          '0': 'logs'
        };

        if (shortcuts[e.key]) {
          e.preventDefault();
          this.nav.goToSection(shortcuts[e.key]);
        }
      }

      // Arrow key navigation
      if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault();
        this.navigatePrevious();
      } else if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault();
        this.navigateNext();
      }
    });
  }

  navigatePrevious() {
    const sections = ['overview', 'api-usage', 'publishes', 'errors', 'activity', 'performance', 'users', 'reports', 'health', 'logs'];
    const currentIndex = sections.indexOf(this.nav.getCurrentSection());
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : sections.length - 1;
    this.nav.goToSection(sections[previousIndex]);
  }

  navigateNext() {
    const sections = ['overview', 'api-usage', 'publishes', 'errors', 'activity', 'performance', 'users', 'reports', 'health', 'logs'];
    const currentIndex = sections.indexOf(this.nav.getCurrentSection());
    const nextIndex = currentIndex < sections.length - 1 ? currentIndex + 1 : 0;
    this.nav.goToSection(sections[nextIndex]);
  }
}

/**
 * Breadcrumb Navigation
 */
class BreadcrumbNavigation {
  constructor(container) {
    this.container = container;
    this.breadcrumbs = [];
  }

  update(currentSection) {
    // Clear existing breadcrumbs
    this.container.innerHTML = '';

    // Build breadcrumb trail
    const breadcrumbs = this.buildBreadcrumbs(currentSection);
    
    breadcrumbs.forEach((crumb, index) => {
      const element = this.createBreadcrumbElement(crumb, index === breadcrumbs.length - 1);
      this.container.appendChild(element);

      // Add separator (except for last item)
      if (index < breadcrumbs.length - 1) {
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = '/';
        this.container.appendChild(separator);
      }
    });
  }

  buildBreadcrumbs(section) {
    const breadcrumbs = [
      { text: 'Dashboard', section: 'overview' }
    ];

    if (section !== 'overview') {
      const sectionData = this.getSectionData(section);
      breadcrumbs.push({ text: sectionData.title, section });
    }

    return breadcrumbs;
  }

  createBreadcrumbElement(crumb, isLast) {
    if (isLast) {
      const span = document.createElement('span');
      span.className = 'breadcrumb-current';
      span.textContent = crumb.text;
      return span;
    } else {
      const link = document.createElement('a');
      link.className = 'breadcrumb-link';
      link.href = `#${crumb.section}`;
      link.textContent = crumb.text;
      return link;
    }
  }

  getSectionData(section) {
    // Reuse the section data from NavigationController
    return new NavigationController().getSectionData(section);
  }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize navigation controller
  window.navigationController = new NavigationController();

  // Initialize keyboard navigation
  window.keyboardNavigation = new KeyboardNavigationHandler(window.navigationController);

  // Initialize breadcrumbs if container exists
  const breadcrumbContainer = document.getElementById('breadcrumbs');
  if (breadcrumbContainer) {
    window.breadcrumbNavigation = new BreadcrumbNavigation(breadcrumbContainer);
    
    // Update breadcrumbs on navigation change
    document.addEventListener('navigationChanged', (e) => {
      window.breadcrumbNavigation.update(e.detail.currentSection);
    });
  }

  // Add helpful console message
  console.log('🧭 Navigation initialized');
  console.log('💡 Keyboard shortcuts: Alt + 1-9 for quick navigation, Alt + ← → for previous/next');
});

// Export for use in other modules
export { NavigationController, KeyboardNavigationHandler, BreadcrumbNavigation };