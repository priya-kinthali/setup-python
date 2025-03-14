import sys

argCount = len(sys.argv) - 1

if argCount == 1:
    expectedVersion = sys.argv[1]
    versions = len(expectedVersion.split("."))
    majorMinor = str(sys.version_info[0]) + '.' + str(sys.version_info[1])

    # Check if the expected version has a 't' suffix
    isFreethreaded = expectedVersion.endswith('t')
    if isFreethreaded:
        expectedVersion = expectedVersion[:-1]  # Remove the 't' suffix for comparison

    if versions == 2:
        # Test only major and minor version
        if expectedVersion != majorMinor:
            raise Exception("Incorrect major + minor version detected\nExpected: " + expectedVersion + "\nActual: " + majorMinor)
    elif versions == 3:
        # Test major, minor and micro version
        majorMinorMicro = majorMinor + '.' + str(sys.version_info[2])
        if expectedVersion != majorMinorMicro:
            raise Exception("Incorrect major + minor + micro version detected\nExpected: " + expectedVersion + "\nActual: " + majorMinorMicro)
    else: 
        raise Exception("Incorrect number of arguments supplied")
    
    detectedVersion = majorMinorMicro + ('t' if isFreethreaded else '')
    if isFreethreaded:
        expectedVersion += 't'  # Add the 't' suffix back for the final output comparison

    print("Correct version of Python " + detectedVersion + " detected")
else:
    raise Exception("Incorrect number of arguments supplied")