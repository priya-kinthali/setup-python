import sys
argCount = len(sys.argv) - 1

if argCount == 1:
    inputVersion = sys.argv[1]
    expectedVersion = inputVersion.rstrip('t') if inputVersion.endswith('t') else inputVersion
    versions = len(expectedVersion.split("."))
    majorMinor = str(sys.version_info[0]) + '.' + str(sys.version_info[1])

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
    print("Correct version of Python " + expectedVersion + " detected")
else:
    raise Exception("Incorrect number of arguments supplied")