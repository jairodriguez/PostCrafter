# PostCrafter Operational Procedures

## Overview

This document outlines the operational procedures for managing the PostCrafter API in production, including monitoring, backup, disaster recovery, and incident response protocols.

## Monitoring and Alerting

### System Monitoring

#### 1. Health Checks

**Automated Health Monitoring:**
- **Endpoint**: `/api/health`
- **Frequency**: Every 5 minutes
- **Expected Response**: 200 OK with health status
- **Alert Threshold**: 3 consecutive failures

**Monitoring Configuration:**
```yaml
health_check:
  endpoint: /api/health
  interval: 5m
  timeout: 10s
  retries: 3
  alert_threshold: 3
```

#### 2. Performance Monitoring

**Key Metrics:**
- Response time (p95 < 2s)
- Error rate (< 5%)
- Throughput (requests/second)
- Memory usage
- CPU utilization

**Monitoring Tools:**
- Vercel Analytics
- Custom metrics dashboard
- Real-time alerting

#### 3. Security Monitoring

**Security Events:**
- Authentication failures
- Rate limit violations
- Suspicious IP activity
- API key exposure attempts

**Alert Configuration:**
```yaml
security_alerts:
  auth_failures:
    threshold: 10/minute
    action: block_ip
  rate_limit_violations:
    threshold: 50/minute
    action: alert_admin
  suspicious_activity:
    threshold: 5/minute
    action: investigate
```

### Alert Channels

#### 1. Email Alerts
- **Critical**: Immediate notification
- **Warning**: Daily summary
- **Info**: Weekly report

#### 2. Slack/Discord Integration
- Real-time critical alerts
- Performance notifications
- Security event updates

#### 3. PagerDuty Integration
- On-call escalation
- Incident management
- Response coordination

## Backup Procedures

### Data Backup Strategy

#### 1. Configuration Backup

**Backup Frequency**: Daily
**Retention**: 30 days
**Backup Items**:
- Environment variables
- Vercel configuration
- WordPress connection settings
- API keys (encrypted)

**Backup Process**:
```bash
# Daily configuration backup
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/config"

# Backup environment variables (encrypted)
gpg --encrypt --recipient admin@postcrafter.com .env > $BACKUP_DIR/env.$DATE.gpg

# Backup Vercel configuration
cp vercel.json $BACKUP_DIR/vercel.$DATE.json

# Backup WordPress settings
cp wp-config.json $BACKUP_DIR/wp-config.$DATE.json

# Cleanup old backups (older than 30 days)
find $BACKUP_DIR -name "*.gpg" -mtime +30 -delete
find $BACKUP_DIR -name "*.json" -mtime +30 -delete
```

#### 2. Code Backup

**Backup Frequency**: On every deployment
**Retention**: Indefinite
**Backup Location**: GitHub repository

**Backup Process**:
- Automatic backup on git push
- Tagged releases for major versions
- Branch protection for main branch

#### 3. WordPress Content Backup

**Backup Frequency**: Daily
**Retention**: 90 days
**Backup Method**: WordPress export + database backup

**Backup Process**:
```bash
# WordPress content backup
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/wordpress"

# Export WordPress content
wp export --path=/var/www/html --dir=$BACKUP_DIR --filename_format=content.$DATE.xml

# Database backup
wp db export --path=/var/www/html $BACKUP_DIR/database.$DATE.sql

# Compress backups
gzip $BACKUP_DIR/content.$DATE.xml
gzip $BACKUP_DIR/database.$DATE.sql

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/content.$DATE.xml.gz s3://postcrafter-backups/wordpress/
aws s3 cp $BACKUP_DIR/database.$DATE.sql.gz s3://postcrafter-backups/wordpress/
```

### Backup Verification

#### 1. Automated Testing
- **Frequency**: Weekly
- **Process**: Restore backup to test environment
- **Validation**: Verify API functionality

#### 2. Manual Verification
- **Frequency**: Monthly
- **Process**: Full backup restoration test
- **Documentation**: Test results and issues

## Disaster Recovery

### Recovery Scenarios

#### 1. API Service Failure

**Detection**: Health check failures
**Recovery Time Objective (RTO)**: 15 minutes
**Recovery Point Objective (RPO)**: 5 minutes

**Recovery Process**:
```bash
# 1. Assess the situation
curl -f https://api.postcrafter.com/health || echo "API down"

# 2. Check Vercel status
vercel status

# 3. Redeploy if necessary
vercel --prod

# 4. Verify recovery
curl -f https://api.postcrafter.com/health && echo "API recovered"
```

#### 2. WordPress Site Failure

**Detection**: WordPress API errors
**RTO**: 30 minutes
**RPO**: 1 hour

**Recovery Process**:
```bash
# 1. Check WordPress site
curl -f https://wordpress-site.com/wp-json/wp/v2/posts

# 2. Restore from backup if needed
wp db import --path=/var/www/html /backups/wordpress/database.latest.sql

# 3. Restore content
wp import --path=/var/www/html /backups/wordpress/content.latest.xml --authors=create

# 4. Verify WordPress functionality
curl -f https://wordpress-site.com/wp-json/wp/v2/posts
```

#### 3. Data Loss Scenario

**Detection**: Missing posts or content
**RTO**: 2 hours
**RPO**: 24 hours

**Recovery Process**:
```bash
# 1. Identify lost data
wp post list --path=/var/www/html --format=csv > current_posts.csv
diff current_posts.csv backup_posts.csv

# 2. Restore from backup
wp db import --path=/var/www/html /backups/wordpress/database.recovery.sql

# 3. Verify data integrity
wp post list --path=/var/www/html --format=csv > recovered_posts.csv
diff recovered_posts.csv backup_posts.csv
```

### Recovery Testing

#### 1. Monthly Recovery Tests
- **Scope**: Full disaster recovery simulation
- **Duration**: 4 hours
- **Participants**: DevOps team
- **Documentation**: Test results and lessons learned

#### 2. Quarterly Recovery Drills
- **Scope**: Complete system recovery
- **Duration**: 8 hours
- **Participants**: Full team
- **Validation**: End-to-end functionality testing

## Incident Response

### Incident Classification

#### 1. Critical (P0)
- **Definition**: Complete service outage
- **Response Time**: 15 minutes
- **Escalation**: Immediate
- **Examples**: API completely down, data loss

#### 2. High (P1)
- **Definition**: Major functionality affected
- **Response Time**: 1 hour
- **Escalation**: 30 minutes
- **Examples**: High error rate, performance degradation

#### 3. Medium (P2)
- **Definition**: Minor functionality affected
- **Response Time**: 4 hours
- **Escalation**: 2 hours
- **Examples**: Non-critical feature failure

#### 4. Low (P3)
- **Definition**: Cosmetic or minor issues
- **Response Time**: 24 hours
- **Escalation**: 8 hours
- **Examples**: UI issues, documentation updates

### Incident Response Process

#### 1. Detection and Alerting

**Automated Detection**:
```yaml
incident_detection:
  health_check_failure:
    threshold: 3
    action: create_incident
  high_error_rate:
    threshold: 10%
    action: create_incident
  security_breach:
    threshold: 1
    action: create_incident_immediate
```

#### 2. Initial Response

**Immediate Actions**:
1. Acknowledge incident
2. Assess impact and scope
3. Implement immediate mitigation
4. Notify stakeholders

**Response Checklist**:
- [ ] Incident ticket created
- [ ] Impact assessment completed
- [ ] Mitigation steps implemented
- [ ] Stakeholders notified
- [ ] Status page updated

#### 3. Investigation and Resolution

**Investigation Process**:
1. Gather evidence and logs
2. Identify root cause
3. Develop resolution plan
4. Implement fix
5. Verify resolution

**Resolution Checklist**:
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Testing completed
- [ ] Monitoring restored
- [ ] Documentation updated

#### 4. Post-Incident Review

**Review Process**:
1. Incident timeline reconstruction
2. Root cause analysis
3. Lessons learned identification
4. Process improvement recommendations
5. Action item assignment

**Review Deliverables**:
- Incident report
- Root cause analysis
- Lessons learned document
- Process improvement plan
- Action item tracking

### Communication Plan

#### 1. Internal Communication

**Escalation Matrix**:
```
Level 1: On-call engineer (15 min)
Level 2: Senior engineer (30 min)
Level 3: Engineering manager (1 hour)
Level 4: CTO (2 hours)
```

**Communication Channels**:
- Slack: Real-time updates
- Email: Formal notifications
- Phone: Critical escalations

#### 2. External Communication

**Status Page Updates**:
- Incident creation
- Progress updates
- Resolution notification

**Customer Communication**:
- Email notifications for affected users
- Support ticket updates
- Public announcements for major incidents

## Maintenance Procedures

### Scheduled Maintenance

#### 1. Weekly Maintenance

**Tasks**:
- Log rotation and cleanup
- Performance review
- Security scan
- Backup verification

**Schedule**: Sunday 2:00 AM UTC
**Duration**: 2 hours
**Notification**: 24 hours in advance

#### 2. Monthly Maintenance

**Tasks**:
- Dependency updates
- Security patches
- Performance optimization
- Full system health check

**Schedule**: First Sunday of month, 2:00 AM UTC
**Duration**: 4 hours
**Notification**: 1 week in advance

#### 3. Quarterly Maintenance

**Tasks**:
- Major version updates
- Infrastructure review
- Disaster recovery testing
- Security audit

**Schedule**: Quarterly planning
**Duration**: 8 hours
**Notification**: 2 weeks in advance

### Emergency Maintenance

**Criteria**:
- Critical security vulnerabilities
- Performance issues affecting users
- Compliance requirements

**Process**:
1. Immediate assessment
2. Stakeholder notification
3. Maintenance window scheduling
4. Implementation and verification
5. Post-maintenance review

## Performance Optimization

### Regular Optimization Tasks

#### 1. Daily Monitoring
- Response time analysis
- Error rate tracking
- Resource utilization review

#### 2. Weekly Optimization
- Performance bottleneck identification
- Code optimization opportunities
- Database query optimization

#### 3. Monthly Review
- Architecture optimization
- Scaling strategy review
- Cost optimization

### Performance Metrics

**Key Performance Indicators (KPIs)**:
- Response time (p95 < 2s)
- Error rate (< 5%)
- Uptime (> 99.9%)
- Throughput (requests/second)

**Monitoring Dashboard**:
- Real-time metrics
- Historical trends
- Alert thresholds
- Performance reports

## Security Procedures

### Security Monitoring

#### 1. Continuous Monitoring
- Authentication attempts
- API usage patterns
- Security event logging
- Threat detection

#### 2. Security Audits
- Monthly vulnerability scans
- Quarterly penetration testing
- Annual security assessment

### Incident Response

#### 1. Security Incident Classification
- **Critical**: Data breach, unauthorized access
- **High**: Suspicious activity, potential breach
- **Medium**: Security policy violation
- **Low**: Minor security issues

#### 2. Response Procedures
- Immediate containment
- Evidence preservation
- Investigation and analysis
- Remediation and recovery
- Post-incident review

## Compliance and Governance

### Data Protection

#### 1. Data Classification
- **Public**: Non-sensitive information
- **Internal**: Company information
- **Confidential**: User data, API keys
- **Restricted**: Personal information

#### 2. Data Handling
- Encryption at rest and in transit
- Access control and authentication
- Data retention policies
- Privacy compliance

### Audit and Compliance

#### 1. Regular Audits
- Monthly security audits
- Quarterly compliance reviews
- Annual external audits

#### 2. Documentation
- Audit trails
- Compliance reports
- Policy documentation
- Procedure updates

## Conclusion

This operational procedures document provides a comprehensive framework for managing the PostCrafter API in production. Regular review and updates ensure procedures remain current and effective.

For questions or updates to these procedures, contact the DevOps team. 