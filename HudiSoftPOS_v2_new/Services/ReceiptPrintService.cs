using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;

namespace HudiSoftPOS.Services
{
    /// <summary>
    /// Prints HTML receipts to the default printer without relying on .html file association.
    /// Uses an in-process hidden WebBrowser and COM ExecWB for silent print.
    /// </summary>
    public static class ReceiptPrintService
    {
        private const int OLECMDID_PRINT = 6;
        private const int OLECMDEXECOPT_DONTPROMPTUSER = 2;

        [ComImport]
        [Guid("6D5140C1-7436-11CE-8034-00AA006009FA")]
        [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IOleServiceProvider
        {
            [PreserveSig]
            int QueryService(
                [MarshalAs(UnmanagedType.LPStruct)] Guid guidService,
                [MarshalAs(UnmanagedType.LPStruct)] Guid riid,
                [MarshalAs(UnmanagedType.IUnknown)] out object ppvObject);
        }

        /// <summary>
        /// Prints HTML content to the default printer. Must be called from the UI thread (e.g. from a ViewModel via Application.Current.Dispatcher).
        /// </summary>
        public static Task<bool> PrintHtmlAsync(string html)
        {
            var tcs = new TaskCompletionSource<bool>();
            if (html == null)
            {
                tcs.SetResult(false);
                return tcs.Task;
            }

            void DoPrint()
            {
                Window? printWindow = null;
                WebBrowser? browser = null;
                try
                {
                    printWindow = new Window
                    {
                        Width = 1,
                        Height = 1,
                        WindowStyle = WindowStyle.None,
                        ShowInTaskbar = false,
                        Left = -10000,
                        Top = -10000,
                        Visibility = Visibility.Hidden
                    };
                    browser = new WebBrowser();
                    printWindow.Content = browser;

                    async void OnLoaded(object sender, EventArgs e)
                    {
                        try
                        {
                            browser.LoadCompleted -= OnLoaded;
                            bool ok = PrintWebBrowser(browser);
                            if (!ok)
                            {
                                try { browser.InvokeScript("print"); ok = true; }
                                catch { }
                            }
                            await Task.Delay(500);
                            tcs.TrySetResult(ok);
                        }
                        catch (Exception ex)
                        {
                            tcs.TrySetResult(false);
                            System.Diagnostics.Debug.WriteLine($"ReceiptPrintService: {ex.Message}");
                        }
                        finally
                        {
                            try
                            {
                                printWindow?.Close();
                            }
                            catch { }
                        }
                    }

                    browser.LoadCompleted += OnLoaded;
                    browser.NavigateToString(html);
                    printWindow.Show();
                }
                catch (Exception ex)
                {
                    tcs.TrySetResult(false);
                    System.Diagnostics.Debug.WriteLine($"ReceiptPrintService: {ex.Message}");
                    try { printWindow?.Close(); } catch { }
                }
            }

            if (Application.Current?.Dispatcher == null)
            {
                tcs.SetResult(false);
                return tcs.Task;
            }

            Application.Current.Dispatcher.BeginInvoke(DispatcherPriority.Normal, new Action(() =>
            {
                DoPrint();
            }));

            return tcs.Task;
        }

        private static bool PrintWebBrowser(WebBrowser browser)
        {
            if (browser?.Document == null) return false;
            try
            {
                var sp = browser.Document as IOleServiceProvider;
                if (sp == null) return false;

                var iidWebBrowserApp = new Guid("0002DF05-0000-0000-C000-000000000046");
                var iidWebBrowser2 = new Guid("D30C1661-CDAF-11d0-8A3E-00C04FC9E26E");
                sp.QueryService(iidWebBrowserApp, iidWebBrowser2, out object wbObj);
                if (wbObj == null) return false;

                // IWebBrowser2.ExecWB(OLECMDID_PRINT, OLECMDEXECOPT_DONTPROMPTUSER, ...)
                dynamic wb = wbObj;
                wb.ExecWB(OLECMDID_PRINT, OLECMDEXECOPT_DONTPROMPTUSER, null, null);
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ExecWB failed: {ex.Message}");
                return false;
            }
        }
    }
}
