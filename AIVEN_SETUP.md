# Aiven MySQL Database Setup Guide

## Overview
This guide will help you connect your Ghana Code Library application to your Aiven MySQL database service.

## Prerequisites
- Aiven MySQL service running (iykelibrary-iykelibrary.f.aivencloud.com:10772)
- Your Aiven service credentials
- CA certificate from Aiven dashboard

## Step 1: Get Your Aiven Credentials

From your Aiven dashboard, you need:
- **Host**: `iykelibrary-iykelibrary.f.aivencloud.com`
- **Port**: `10772`
- **Database**: `defaultdb`
- **Username**: `CLICK_TO` (or your actual username)
- **Password**: Your actual password
- **CA Certificate**: SSL certificate content

## Step 2: Get the CA Certificate

1. In your Aiven dashboard, go to the "Get started" page
2. Look for the "CA certificate" section
3. Click "Show" to reveal the certificate
4. Copy the entire certificate content (including BEGIN and END markers)
5. Or download it using the download button

## Step 3: Create Environment File

Create a `.env` file in your project root with:

```bash
# MySQL Database Configuration (Aiven)
MYSQL_HOST=iykelibrary-iykelibrary.f.aivencloud.com
MYSQL_USER=CLICK_TO
MYSQL_PASSWORD=your_actual_password_here
MYSQL_DATABASE=defaultdb
MYSQL_PORT=10772

# SSL Configuration for Aiven (REQUIRED)
MYSQL_CA_CERT=-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgQ0EwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBD
QTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB5YqFjsl8X9j8C7WPZqWW85q4aXdlsLj/4PmJ0rqGnx1Z+WFj
6MDyXBo+YeZ6LV423Mk0atR46C+GCJRQK7YaBtJhJT2c0j12t3R6XGdR4O1w3u60
4Meq9G6bNmyjntv4l1UR2tPL0E6zM+F3C0qwqE4hDcL0oT2kMSwmxSk1/C2N6Z6w
2lYoqmCeSBlDF4j9ulZ6AUM27JDZeEeF4twXLjR5Pj2Qw==
-----END CERTIFICATE-----

# Other configurations...
NODE_ENV=development
VITE_APP_TITLE=Ghana Code Library
BCRYPT_SALT_ROUNDS=12
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
PORT=3001
HOST=localhost
```

## Step 4: Test the Connection

1. Start your application:
   ```bash
   npm run dev
   ```

2. Check the console for connection status:
   - Success: "MySQL database connected successfully"
   - Error: Check your credentials and SSL configuration

## Step 5: Database Initialization

On first run, the application will automatically:
- Connect to your Aiven MySQL database
- Create all necessary tables
- Set up the complete database schema

## Troubleshooting

### SSL Connection Issues
- Ensure `MYSQL_CA_CERT` is properly set
- Verify the certificate format (must include BEGIN/END markers)
- Check that SSL mode is set to "REQUIRED" in Aiven

### Authentication Issues
- Verify username and password
- Ensure the user has proper permissions on the database
- Check if the user exists in Aiven

### Network Issues
- Verify the host and port are correct
- Check if your network allows outbound connections to port 10772
- Ensure Aiven service is running

## Security Notes

- **Never commit `.env` files** to version control
- **SSL is mandatory** for Aiven connections
- **Use strong passwords** for database access
- **Rotate credentials** regularly

## Next Steps

After successful connection:
1. Your database tables will be created automatically
2. You can start using the application with your Aiven database
3. Monitor connection performance in Aiven dashboard
4. Set up automated backups if needed

## Support

If you encounter issues:
1. Check Aiven service status
2. Verify your credentials
3. Review the application logs
4. Check Aiven documentation for troubleshooting

