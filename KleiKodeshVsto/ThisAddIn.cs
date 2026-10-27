using KitveiHakodeshLib.Dictionary;
using KleiKodesh.Ribbon;
using KitveiHakodeshLib.Pdf;
using Office = Microsoft.Office.Core;
using System;

namespace KleiKodesh
{
    public partial class ThisAddIn
    {
        protected override Office.IRibbonExtensibility CreateRibbonExtensibilityObject()
        {
            return new KeliKodeshRibbon();
        }

        // Exposes the add-in's commands to VBA as Application.COMAddIns("KleiKodesh").Object.
        // Office asks for this at load: keep it a bare allocation, no work.
        protected override object RequestComAddInAutomationService()
        {
            return new VbaCommands();
        }

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            WordToPdfConverter.HostApplication = this.Application;
            WordThesaurusProvider.HostApplication = this.Application;
            ReapplyShortcuts();
        }

        /// <summary>
        /// Puts back any keyboard shortcut the user asked for that the macros template
        /// no longer carries - which is what happens when the template was replaced
        /// (the user switched macro names between Hebrew and English) or reinstalled.
        /// See Helpers\WordShortcuts.cs.
        ///
        /// Whether Word has already loaded its STARTUP templates by the time a COM
        /// add-in starts is not something we can rely on, so when the template is not
        /// there yet this waits for the first document window and tries once more.
        /// Nothing is lost if neither attempt finds it: the shortcuts already saved
        /// inside the template are Word's own, and the settings pane re-applies too.
        /// </summary>
        private void ReapplyShortcuts()
        {
            try
            {
                if (Helpers.WordShortcuts.IsReady)
                {
                    Helpers.WordShortcuts.ReapplyAll();
                    return;
                }
                Application.WindowActivate += OnFirstWindowActivate;
            }
            catch { }
        }

        private void OnFirstWindowActivate(Microsoft.Office.Interop.Word.Document doc,
                                           Microsoft.Office.Interop.Word.Window window)
        {
            try { Application.WindowActivate -= OnFirstWindowActivate; } catch { }
            try { Helpers.WordShortcuts.ReapplyAll(); } catch { }
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
            WordToPdfConverter.CancelHostConversions();
        }

        #region VSTO generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InternalStartup()
        {
            this.Startup += new System.EventHandler(ThisAddIn_Startup);
            this.Shutdown += new System.EventHandler(ThisAddIn_Shutdown);
        }

        #endregion
    }
}
