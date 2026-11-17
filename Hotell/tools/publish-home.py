from deploy import ROOT,upload
upload('/domains/biancanoor.no/public_html','hotell-kort.jpg',(ROOT.parent/'Hjemmeside/hotell-kort.jpg').read_bytes())
upload('/domains/biancanoor.no/public_html','hotell-venninner.jpg',(ROOT.parent/'Hjemmeside/hotell-venninner.jpg').read_bytes())
upload('/domains/biancanoor.no/public_html','index.html',(ROOT.parent/'Hjemmeside/index.html').read_bytes())
