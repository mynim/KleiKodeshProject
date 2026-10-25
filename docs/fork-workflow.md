# עבודה עם הפורק הזה

המאגר הזה הוא **פורק** של [KleiKodesh/KleiKodeshProject](https://github.com/KleiKodesh/KleiKodeshProject).

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

## תלויות לבנייה — מצב המחשב הזה

נבדק ב‑25.10.2026:

| דרישה | מצב |
|---|---|
| Word (Office 16) | ✅ מותקן |
| .NET Framework 4.8 Runtime | ✅ מותקן |
| Node.js | ✅ מותקן |
| **Visual Studio 2022** (עם Office Developer Tools + VSTO SDK) | ❌ **חסר** |
| **.NET SDK / MSBuild** | ❌ **חסר** |
| **NSIS 3.08+** (לבניית מתקין) | ❌ **חסר** |

כלומר: אפשר כבר עכשיו לעבוד על **ממשק Vue** של כתבי הקודש (`cd KitveiHakodesh/vue-frontend && npm install && npm run dev`), אבל **אי אפשר לבנות את תוסף ה‑VSTO** עד להתקנת Visual Studio.

### התקנה

```powershell
winget install Microsoft.VisualStudio.2022.Community
```

ואז ב‑Visual Studio Installer לסמן:
- **.NET desktop development**
- **Office/SharePoint development** (זה מביא את VSTO SDK)

NSIS, רק אם בונים מתקין:

```powershell
winget install NSIS.NSIS
```

### בנייה

```powershell
# כל הפרויקט
msbuild KleiKodeshProject.slnx /p:Configuration=Debug /p:Platform=x64

# מתקין
Build\build-menu.bat
```

## תת‑מאגרים (submodules)

ה‑README הראשי מזכיר שלושה submodules (`DocumentLocator`, `hebrew-typing-tutor`, `kleikodesh-website`). במצב `master` הנוכחי קובץ `.gitmodules` **ריק** — אין submodules פעילים, ו‑`git clone` רגיל מספיק. התיעוד ב‑README עדיין לא עודכן בנקודה הזו.
