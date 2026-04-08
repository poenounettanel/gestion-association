from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Listen for console events
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"CRASH: {exc}"))
        
        print("Navigating to local index.html...")
        page.goto("file:///c:/Users/tongi/Documents/Classeur/app/index.html")
        page.wait_for_timeout(1000)
        
        print("Attempting to click submit button...")
        try:
            page.fill("#auth-email", "admin@association.com")
            page.fill("#auth-password", "1234567")
            page.click("button[type='submit']")
        except Exception as e:
            print(f"Error during interaction: {e}")
            
        page.wait_for_timeout(2000)
        print("Done.")
        browser.close()

if __name__ == "__main__":
    run()
