import asyncio, json, sys
from playwright.async_api import async_playwright
ROUTES = sys.argv[1].split(",") if len(sys.argv)>1 else ["/","/butler","/scripts","/knowledge","/connect","/settings","/logs","/permissions","/builder","/components","/cosmetic","/fileshare","/onboarding","/data-safety","/security-trust","/privacy-policy","/terms","/crash-report"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"])
        ctx = await b.new_context(viewport={"width":412,"height":915}, is_mobile=True, has_touch=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36")
        await ctx.grant_permissions(["camera"], origin="http://localhost:8080")
        page = await ctx.new_page()
        errs=[]
        page.on("pageerror", lambda e: errs.append("PAGEERROR "+str(e).split("\n")[0][:220]))
        page.on("console", lambda m: errs.append("CONSOLE "+m.text[:200]) if m.type=="error" else None)
        out={}
        for r in ROUTES:
            errs.clear()
            try:
                await page.goto("http://localhost:8080"+r, wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(900)
            except Exception as e:
                out[r]={"nav_error":str(e)[:150]}; continue
            n = await page.locator("button:visible").count()
            clicked=0
            for i in range(min(n,14)):
                try:
                    loc = page.locator("button:visible").nth(i)
                    await loc.click(timeout=900, no_wait_after=True)
                    clicked+=1
                    await page.wait_for_timeout(90)
                except Exception: pass
                if not page.url.endswith(r.rstrip("/") or "/"):
                    try:
                        await page.goto("http://localhost:8080"+r, wait_until="domcontentloaded", timeout=10000)
                        await page.wait_for_timeout(300)
                    except Exception: break
            out[r]={"buttons":n,"clicked":clicked,"errors":sorted(set(errs))[:5]}
        print(json.dumps(out, indent=1))
        await b.close()
asyncio.run(main())
