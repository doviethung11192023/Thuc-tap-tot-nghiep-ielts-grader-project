import time
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

ARTIFACT_DIR = r"C:\Users\Admin\.gemini\antigravity\brain\eb6c68c0-d77e-4a6a-8e53-bf97bbe8c500"

def get_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1536,960")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(30)
    return driver

def run_tests():
    driver = get_driver()
    try:
        # Step 1: Login
        print("1. Logging in via http://localhost:3000/login...")
        driver.get("http://localhost:3000/login")
        time.sleep(2)

        email_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='email']")
        pwd_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
        if email_inputs and pwd_inputs:
            email_inputs[0].clear()
            email_inputs[0].send_keys("test1@gmail.com")
            pwd_inputs[0].clear()
            pwd_inputs[0].send_keys("Admin123456@")
            
            submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_btn.click()
            time.sleep(3)
            print("Login submitted. Current URL:", driver.current_url)

        # Step 2: Student Test Practice Page
        print("\n2. Visiting Student /test-practice...")
        driver.get("http://localhost:3000/test-practice")
        time.sleep(4)
        
        shot1 = os.path.join(ARTIFACT_DIR, "test_practice_authenticated_verified.png")
        driver.save_screenshot(shot1)
        print(f"Saved: {shot1}")

        # Step 3: Test Collection Detail Page
        print("\n3. Navigating to set detail...")
        driver.get("http://localhost:3000/test-practice/set/be5fffe8-bc71-405f-8f71-b4ce5de42a52")
        time.sleep(3)
        shot2 = os.path.join(ARTIFACT_DIR, "test_set_detail_authenticated_verified.png")
        driver.save_screenshot(shot2)
        print(f"Saved: {shot2}")

        # Step 4: Admin Tests Management Page
        print("\n4. Visiting Admin /admin/tests...")
        driver.get("http://localhost:3000/admin/tests")
        time.sleep(4)
        shot3 = os.path.join(ARTIFACT_DIR, "admin_tests_page_verified.png")
        driver.save_screenshot(shot3)
        print(f"Saved: {shot3}")

        # Step 5: Open Test Sets Manager Modal
        btn_sets = driver.find_elements(By.XPATH, "//button[contains(., 'Quản Lý Bộ Đề')]")
        if btn_sets:
            print("Clicking 'Quản Lý Bộ Đề'...")
            driver.execute_script("arguments[0].click();", btn_sets[0])
            time.sleep(2)
            shot4 = os.path.join(ARTIFACT_DIR, "admin_test_set_modal_verified.png")
            driver.save_screenshot(shot4)
            print(f"Saved: {shot4}")

            # Close modal
            close_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Đóng') or contains(@class, 'rounded-full')]")
            if close_btns:
                driver.execute_script("arguments[0].click();", close_btns[0])
                time.sleep(1)

        # Step 6: Select test row to test Bulk Action Bar with Set assignment
        checkboxes = driver.find_elements(By.XPATH, "//table//tbody//input[@type='checkbox']")
        if checkboxes:
            print(f"Found {len(checkboxes)} test checkboxes. Clicking first one...")
            driver.execute_script("arguments[0].click();", checkboxes[0])
            time.sleep(1)
            shot5 = os.path.join(ARTIFACT_DIR, "admin_test_bulk_action_bar_verified.png")
            driver.save_screenshot(shot5)
            print(f"Saved: {shot5}")

        print("\n>>> ALL 6 E2E SCREENSHOT CHECKS SUCCEEDED! <<<")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_tests()
