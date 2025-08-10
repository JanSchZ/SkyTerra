#!/usr/bin/env python3
"""
Test script to verify JWT authentication and payment endpoints
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login/"
USER_URL = f"{BASE_URL}/api/auth/user/"
PAYMENT_URL = f"{BASE_URL}/api/payments/create-checkout-session/"
CSRF_URL = f"{BASE_URL}/api/auth/csrf/"

def test_csrf():
    """Test CSRF endpoint"""
    print("🔐 Testing CSRF endpoint...")
    try:
        response = requests.get(CSRF_URL)
        print(f"   Status: {response.status_code}")
        print(f"   Cookies: {dict(response.cookies)}")
        return response.cookies
    except Exception as e:
        print(f"   Error: {e}")
        return None

def test_login(username, password):
    """Test login endpoint"""
    print(f"\n🔑 Testing login with {username}...")
    
    # First get CSRF token
    csrf_cookies = test_csrf()
    if not csrf_cookies:
        print("   Failed to get CSRF token")
        return None
    
    # Prepare login data
    login_data = {
        "username": username,
        "password": password
    }
    
    # Make login request
    try:
        response = requests.post(
            LOGIN_URL,
            json=login_data,
            cookies=csrf_cookies,
            headers={
                "Content-Type": "application/json",
                "X-CSRFToken": csrf_cookies.get("csrftoken", "")
            }
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        print(f"   Cookies after login: {dict(response.cookies)}")
        
        if response.status_code == 200:
            return response.cookies
        else:
            print(f"   Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"   Error: {e}")
        return None

def test_user_endpoint(cookies):
    """Test user endpoint with JWT cookies"""
    print(f"\n👤 Testing user endpoint...")
    
    try:
        response = requests.get(
            USER_URL,
            cookies=cookies
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        print(f"   Cookies: {dict(response.cookies)}")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"   Error: {e}")
        return False

def test_payment_endpoint(cookies):
    """Test payment endpoint with JWT cookies"""
    print(f"\n💳 Testing payment endpoint...")
    
    try:
        response = requests.post(
            PAYMENT_URL,
            json={},
            cookies=cookies
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        print(f"   Cookies: {dict(response.cookies)}")
        
        return response.status_code != 401
        
    except Exception as e:
        print(f"   Error: {e}")
        return False

def main():
    print("🚀 Testing JWT Authentication and Payment Endpoints")
    print("=" * 60)
    
    # Test CSRF
    csrf_cookies = test_csrf()
    if not csrf_cookies:
        print("❌ CSRF test failed")
        return
    
    # Test login (you'll need to provide valid credentials)
    username = input("Enter username or email: ")
    password = input("Enter password: ")
    
    jwt_cookies = test_login(username, password)
    if not jwt_cookies:
        print("❌ Login test failed")
        return
    
    # Test user endpoint
    if test_user_endpoint(jwt_cookies):
        print("✅ User endpoint test passed")
    else:
        print("❌ User endpoint test failed")
        return
    
    # Test payment endpoint
    if test_payment_endpoint(jwt_cookies):
        print("✅ Payment endpoint test passed")
    else:
        print("❌ Payment endpoint test failed")
    
    print("\n🎯 Test completed!")

if __name__ == "__main__":
    main()
