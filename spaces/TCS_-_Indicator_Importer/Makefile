help:
	@echo "pack  package the app"

pack:
	# remove the old package
	rm -f ../TCS_-_Indicator_Importer.zip
	# copy the app into a new directory
	cp -r ./TCS_-_Indicator_Importer ../TCS_-_Indicator_Importer
	# zip the app (do it recursively (-r) and ignore any hidden mac files like '_MACOSX' and '.DS_STORE' (-X))
	cd .. && zip -r -X TCS_-_Indicator_Importer.zip TCS_-_Indicator_Importer
	# remove any existing files from a previous package
	rm -rf ../TCS_-_Indicator_Importer
	@echo "App has been packaged here: ../TCS_-_Indicator_Importer.zip"
