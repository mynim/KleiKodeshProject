# עבודה עם הפורק הזה

המאגר הזה הוא **פורק** של [KleiKodesh/KleiKodeshProject](https://github.com/KleiKodesh/KleiKodeshProject).

> **מסמך זה עוסק בסביבת הפיתוח ובחסמים הטכניים — מה צריך כדי שהפרויקט ייבנה בכלל.**
> שני המסמכים המשלימים:
> [**roadmap.md**](roadmap.md) — מה נבנה, באיזה סדר ובאיזה ענף · [**workflow.md**](workflow.md) — איך כל שינוי עובר, מענף ועד PR.
> נקודת הפתיחה לכל השלושה: [**CLAUDE.md**](../CLAUDE.md).

## האם הפורק מתעדכן לבד?

**לא.** GitHub לא מסנכרן פורקים אוטומטית. כשיוצא עדכון במאגר הראשי, הפורק נשאר מאחור עד שמושכים אותו ידנית.

הרמוט `upstream` כבר מוגדר במאגר המקומי:

```bash
git remote -v
# origin    https://github.com/mynim/KleiKodeshProject.git
# upstream  https://github.com/KleiKodesh/KleiKodeshProject.git
```

### סנכרון — הדרך הקצרה

```bash
gh repo sync mynim/KleiKodeshProject --source KleiKodesh/KleiKodeshProject
```

זה מעדכן את `master` ב‑GitHub. אחר כך מושכים למחשב:

```bash
git checkout master && git pull
```

### סנכרון — ידנית

```bash
git fetch upstream
git checkout master
git merge upstream/master
git push
```

### למה עדיף לא לכתוב ישירות על master

כל עוד `master` בפורק זהה בדיוק ל‑`master` של המאגר הראשי, הסנכרון הוא **fast‑forward** ולעולם לא ייתקע בקונפליקטים. לכן:

- `master` = מראה של המאגר הראשי. לא נוגעים.
- כל שינוי שלך = ענף נפרד (`docs/…`, `feature/…`), שמתבסס על `master` מעודכן.

מסמכי המחקר בתיקייה `docs/` יושבים בענף `docs/rabotenu-comparison` בדיוק מהסיבה הזו.

### אם רוצים סנכרון אוטומטי

אפשר להוסיף workflow שמריץ `gh repo sync` פעם ביום. זה דורש הוספת קובץ ל‑`.github/workflows/` — כלומר שינוי ב‑`master`, שמבטל את יתרון ה‑fast‑forward. עדיף להריץ את הפקודה ידנית לפני כל סבב עבודה.

## תלויות לבנייה

### ⚠️ צריך Visual Studio **2026**, לא 2022

ה‑README הראשי אומר "Visual Studio 2022 Community". **זה לא מעודכן.** שתי ראיות בקוד:

1. `rebuild-all.ps1` מצביע על `C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\...` — גרסה 18 היא VS 2026.
2. פרויקטים מרכזיים מכוונים ל‑`net10.0` / `net10.0-windows`, ביניהם `WpfLib` (שכל שרשרת התוסף תלויה בו) ו‑`FtsLib`. VS 2022 לא תומך ב‑.NET 10.

VS 2026 כולל את ה‑SDK של .NET 10 ואת workload ה‑Office עם כלי VSTO.

### התקנה

```powershell
winget install --id Microsoft.VisualStudio.Community -e --override "--passive --wait --norestart --add Microsoft.VisualStudio.Workload.ManagedDesktop --add Microsoft.VisualStudio.Workload.Office --add Microsoft.VisualStudio.Workload.NativeDesktop --includeRecommended"
```

שלושת ה‑workloads, וכולם **נדרשים**:

| workload | למה |
|---|---|
| `ManagedDesktop` | פיתוח שולחן עבודה ב‑.NET — WPF, חבילות targeting של .NET Framework 4.8 |
| `Office` | פיתוח Microsoft 365, כולל כלי VSTO |
| `NativeDesktop` | **ה‑linker של MSVC.** `KitveiHakodeshService` מתפרסם כ‑native AOT (`PublishAot=true`), ו‑ILC לא יכול לקשר בלעדיו. הכשל: `error : Platform linker not found` |

ה‑VSTO Runtime לא נכלל ב‑Community; הוא דורש Office מותקן על מכונת הפיתוח — וזה המצב כאן.

**שימו לב:** ה‑VS Installer הוא singleton. אם מריצים שתי התקנות במקביל, השנייה יוצאת מיד ומדווחת הצלחה בלי להתקין כלום.

NSIS, רק אם בונים מתקין:

```powershell
winget install NSIS.NSIS
```

### מצב המחשב הזה

נבדק ב‑25.10.2026:

| דרישה | מצב |
|---|---|
| Word (Office 16) | ✅ מותקן |
| .NET Framework 4.8 Runtime | ✅ מותקן |
| Node.js | ✅ מותקן |
| Visual Studio 2026 Community + workloads | ✅ הותקן בסבב הזה |
| NSIS 3.08+ (לבניית מתקין בלבד) | ❌ חסר |

## ⚠️ ChromeTabs — תלות שחסרה בשכפול נקי

`KleiKodeshProject.slnx` ו‑`KitveiHakodeshLib.csproj` מפנים ל‑`ChromeTabs/FluentChromeTabs/FluentChromeTabs.csproj`, אבל `.gitignore` מוציא את `/ChromeTabs/` מהמעקב. אחרי `git clone` התיקייה **לא קיימת**, ו‑`KitveiHakodeshLib` → `KleiKodeshVsto` לא נבנים.

התיקייה היא עותק מקומי של [KleiKodesh/EasyTabs](https://github.com/KleiKodesh/EasyTabs) — ראו את הקומיטים `a8297a92` ("Stop tracking EasyTabs") ו‑`8b86aa21` ("Rename the EasyTabs folder to ChromeTabs"). הפתרון:

```bash
git clone https://github.com/KleiKodesh/EasyTabs.git ChromeTabs
```

מריצים את זה **בשורש המאגר**. התיקייה מוגדרת ב‑`.gitignore`, ולכן לא תיכנס לקומיטים.

שווה לפתוח על זה issue במאגר הראשי — השכפול הנקי שבור בלי השלב הזה, והוא לא מתועד.

#### וצריך לעדכן אותה בנפרד

`ChromeTabs` הוא מאגר עצמאי שלא במעקב, והוא **זז בקצב שלו**. `git pull` במאגר הראשי לא נוגע בו, ולכן הוא נשאר מאחור בשקט עד שהבנייה נשברת. הסימפטום שנתקלנו בו בפועל:

```
error CS1061: 'FluentChromeTabsForm' does not contain a definition for 'CloseTabMenuText'
```

ועוד שלושה כמוהו — `CloseOtherTabsMenuText`, `CloseTabsToTheLeftMenuText`, `CloseTabsToTheRightMenuText`. `ChromeTabsMirror.cs` מציב ארבעתם (כתוביות תפריט סגירת הכרטיסיות, באנגלית ובעברית), והם נוספו ל‑EasyTabs בקומיט `a3e8160`. השגיאה לא אומרת שהתיקייה מיושנת; היא נראית כמו שגיאת קומפילציה רגילה.

לכן, לפני כל סבב בנייה:

```bash
git -C ChromeTabs pull --ff-only
```

## עוד שלושה חסמים בשכפול נקי

כל אלה התגלו בניסיון בנייה אמיתי ב‑25.10.2026, וכולם פוגעים בכל מי שמשכפל את המאגר.

### 1. חבילות NuGet בנתיב שגוי

ארבעה פרויקטים מייבאים את `System.ValueTuple` מנתיב יחסי `..\packages\`, שתקף רק כשבונים אותם **מהפתרון המקומי שלהם** — לא מהפתרון הראשי. ה‑restore של הפתרון הראשי שם את החבילות ב‑`packages\` שבשורש, והבנייה נכשלת עם *"This project references NuGet package(s) that are missing on this computer"*.

הפרויקטים: `WebSitesLib`, `Nakdan`, `KitveiHakodeshLib`, `KitveiHakodeshDemoApp`.

הפתרון — restore לכל פתרון‑משנה בנפרד:

```powershell
$msb = 'C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe'
& $msb 'KleiKodeshVsto\nakdan\Nakdan.slnx' -t:restore -p:RestorePackagesConfig=true
& $msb 'KitveiHakodesh\CSharpBackend\KitveiHakodesh.slnx' -t:restore -p:RestorePackagesConfig=true
```

**`WebSitesLib.sln` שבור** ואי אפשר לעשות לו restore: הוא מפנה לנתיב מוחלט מהמחשב של המפתח המקורי — `C:\Users\Admin\source\repos\WpfLib\WpfLib\WpfLib.csproj`. עוקפים בהעתקה ידנית:

```powershell
New-Item -ItemType Directory -Force -Path 'KleiKodeshVsto\WebSitesLib\packages' | Out-Null
Copy-Item 'packages\System.ValueTuple.4.6.1' -Destination 'KleiKodeshVsto\WebSitesLib\packages' -Recurse -Force
```

### 2. `hb-mirror.json` — קובץ סודות שחוסם את הבנייה

`KitveiHakodeshService.csproj` מגדיר target שנכשל בכוונה אם `KitveiHakodesh.Core\HebrewBooks\hb-mirror.json` חסר. הקובץ מחזיק את כתובות המראה של HebrewBooks ומפתחות Cloudflare R2, והוא לא ב‑git.

ההערה בקוד אומרת "Publish-only: dev builds are not blocked" — אבל בנייה רגילה של `KitveiHakodeshLib` מריצה `dotnet publish` של השירות, ולכן ה‑target כן נורה.

`HebrewBooksDownloadSources` מתעד במפורש שקובץ חסר או ריק פשוט מדלג על ה‑fallbacks ונשאר עם ה‑handler הרשמי. לכן קובץ מקומי עם אובייקט ריק מספיק לפיתוח (הוא ב‑gitignore ולא ייכנס לקומיטים):

```json
{ "_comment": "local dev placeholder - official handler only" }
```

### 3. ההתקנה של workload חייבת הרשאות מראש ✅ נפתר

`setup.exe modify --quiet` **לא מעלה הרשאות בעצמו**. אם מריצים אותו לא‑מורם הוא יוצא עם קוד `5007` והלוג אומר: *"Commands with --quiet or --passive should be run elevated from the beginning"*. צריך `Start-Process -Verb RunAs`, ולאשר את ה‑UAC.

כמו כן ל‑verb ‏`modify` אין `--wait` (זו אופציה של ה‑bootstrapper בלבד) — ממתינים לתהליך עצמו.

ועוד מלכודת בבדיקה שאחרי: ה‑linker יושב ב‑`VC\Tools\MSVC\<גרסה>\bin\Hostx64\x64\link.exe` — חמש רמות מתחת ל‑`MSVC`. `find -maxdepth 4` לא ימצא אותו ויראה כאילו ההתקנה נכשלה.

### 4. תעודת החתימה של ClickOnce חסרה

`KleiKodeshVsto.csproj` מגדיר:

```xml
<SignManifests>true</SignManifests>
<ManifestKeyFile>KleiKodesh_TemporaryKey.pfx</ManifestKeyFile>
<ManifestCertificateThumbprint>248FB7586402B5FEA4B6FEFF20723CFBB6437082</ManifestCertificateThumbprint>
```

ה‑`.pfx` מוחרג ב‑`.gitignore` (שורה 256, `*.pfx`), וה‑thumbprint מצביע על תעודה שקיימת רק במחסן התעודות של המפתח המקורי. בשכפול נקי הבנייה נכשלת:

```
error MSB3323: Unable to find manifest signing certificate in the certificate store.
```

**ואין דרך לעקוף את החתימה.** `/p:SignManifests=false` נבדק ונדחה במפורש:

```
Microsoft.VisualStudio.Tools.Office.targets(162,9): error : Cannot build because the
ClickOnce manifest signing option is not selected.
```

כלומר targets של VSTO דורשים חתימה ולא מקבלים "בלי". לכן צריך תעודה.

#### הפתרון לפיתוח מקומי

```powershell
.\Build\scripts\make-dev-cert.ps1
```

הסקריפט יוצר תעודת code‑signing בחתימה עצמית ב‑`Cert:\CurrentUser\My` (בלי הרשאות מנהל), ומפנה אליה את הפרויקט. הוא idempotent — הרצה חוזרת מזהה תעודה קיימת ומשתמשת בה.

**שתי החלטות בתוכו ששווה להכיר:**

1. **ספק CAPI מדור קודם, ולא CNG.** ה‑task ‏`SignFile` של ClickOnce נכשל על מפתחות CNG עם *"Invalid provider type specified"*, ולכן הסקריפט מעביר במפורש `-Provider 'Microsoft Enhanced Cryptographic Provider v1.0'` ו‑`-KeySpec Signature`. תעודה שנוצרה בבררת המחדל לא תחתום.

2. **ה‑thumbprint נכתב ל‑`KleiKodeshVsto.csproj.user`, ולא ל‑csproj.** שלוש סיבות:
   - `Microsoft.Common.CurrentVersion.targets` (שורה 30) מייבא את `$(MSBuildProjectFullPath).user` **אחרי** גוף הפרויקט, ולכן הערך שם גובר על זה שמקודד ב‑csproj.
   - `*.user` מוחרג ב‑`.gitignore` (שורה 26), כך שה‑thumbprint המקומי לא יכול להיכנס בטעות לקומיט ולשבור את הבנייה לכל השאר.
   - הבנייה המקוננת של המתקין מריצה את `KleiKodeshVsto.csproj` דרך `Exec` עם שורת פקודה קבועה (`KleiKodeshVstoInstallerWpf.csproj`, target `BuildVsto`), כך ש‑`/p:` **לא** היה עובר אליה. קובץ ה‑`.user` כן — הבנייה המקוננת מייבאת אותו בעצמה.

התוצאה: אפס שינויים בקבצים במעקב.

**לבנייה שמיועדת להפצה צריך את ה‑`.pfx` האמיתי** מהמתחזק של המאגר הראשי. תעודה בחתימה עצמית תייצר מתקין שעובד מקומית אבל Windows יסמן אותו כלא מזוהה.

## מצב הבנייה — 27.10.2026

workload ה‑C++ הותקן, והקישור הנייטיבי של `KitveiHakodeshService` עובר — `Platform linker not found` נעלם.

**מתקמפל במלואו**, כולל כל מה שהיה חסום קודם: `KitveiHakodeshService` (נייטיבי), `KitveiHakodeshLib`, ו‑`KleiKodeshVsto` → `KleiKodesh.dll`.

**המתקין נבנה גם הוא** — החסם האחרון, תעודת החתימה, נפתר ב‑`Build\scripts\make-dev-cert.ps1` (ראה חסם 4 למעלה). מניפסטי ה‑ClickOnce נוצרים ונחתמים, ו‑`Build\Installer\KleiKodesh.pkg` נוצר במלואו (כ‑46 מגה, 606 קבצים).

**מה שטרם נבדק:** התוסף לא הותקן ולא הורץ בוורד אף פעם. בנייה מוצלחת איננה התקנה מוצלחת — זהו שלב 0 ב‑[docs/roadmap.md](roadmap.md).

### בנייה

```powershell
# כל הפרויקט
msbuild KleiKodeshProject.slnx /p:Configuration=Debug /p:Platform=x64

# מתקין
Build\build-menu.bat
```

## תת‑מאגרים (submodules)

ה‑README הראשי מזכיר שלושה submodules (`DocumentLocator`, `hebrew-typing-tutor`, `kleikodesh-website`). במצב `master` הנוכחי קובץ `.gitmodules` **ריק** — אין submodules פעילים, ו‑`git clone` רגיל מספיק. התיעוד ב‑README עדיין לא עודכן בנקודה הזו.
